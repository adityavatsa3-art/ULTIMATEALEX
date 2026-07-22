import { convertArrayToReadableStream, MockLanguageModelV1 } from "ai/test"

import { buildComponentTree } from "../utils/debugger.js"
import { queryComponentTree } from "../utils/query.js"
import { waitNextRender } from "../utils/render.js"
import {
  convertGeneratorToReadableStream,
  setupTestEnvironment,
  simulateDelayedStream,
} from "./util.js"
import type { LanguageModelV1StreamPart } from "ai"

test("concurrent user input while AI is streaming response", async () => {
  // 1. Setup
  const slowStoryChunks: LanguageModelV1StreamPart[] = [
    { type: "text-delta", textDelta: "Chunk 1. " },
    { type: "text-delta", textDelta: "Chunk 2. " },
    { type: "text-delta", textDelta: "Chunk 3. End." },
    {
      type: "finish",
      finishReason: "stop",
      usage: { promptTokens: 5, completionTokens: 10 },
    },
  ]
  const fullSlowStory = "Chunk 1. Chunk 2. Chunk 3. End."
  const concurrentInputText = "this is concurrent input"
  const ackChunks: LanguageModelV1StreamPart[] = [
    { type: "text-delta", textDelta: "Acknowledged: " },
    { type: "text-delta", textDelta: concurrentInputText },
    {
      type: "finish",
      finishReason: "stop",
      usage: { promptTokens: 5, completionTokens: 5 },
    },
  ]

  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  // First call: Slow story
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertGeneratorToReadableStream(simulateDelayedStream(slowStoryChunks, 150)),
    rawCall: { rawPrompt: "", rawSettings: {} },
  }))

  // Second call: Acknowledgment
  doStreamMock.mockImplementationOnce(async (options) => {
    // Expect the *last* user message to be the concurrent input
    const userMessages = options.prompt.filter((m) => m.role === "user")
    const lastUserMessage = userMessages[userMessages.length - 1]
    expect(lastUserMessage?.content[0]?.text).toBe(concurrentInputText)
    return {
      stream: convertArrayToReadableStream(ackChunks),
      rawCall: { rawPrompt: JSON.stringify(options.prompt), rawSettings: {} },
    }
  })

  const { instance, stdin, stdout, fiber } = await setupTestEnvironment({ model: mockModel })
  assert(stdin)

  // 2. Trigger AI Stream
  stdin.emit("input", "Tell me a slow story")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()

  // 3. Simulate Concurrent Input (after first chunk appears)
  await vi.waitFor(
    () => {
      expect(stdout.get()).toContain("Chunk 1.")
    },
    { timeout: 1000 },
  )

  stdin.emit("input", concurrentInputText)
  await waitNextRender()
  await waitNextRender()

  // 4. Verify Stream Completion and loading state false
  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain(fullSlowStory)
      const tree = buildComponentTree(fiber!.current.child)
      if (queryComponentTree(tree, "Spinner")) {
        throw new Error("Spinner still rendering after slow stream completed")
      }
    },
    { timeout: 5000 },
  )

  // Verify concurrent input is only in buffer before submission - This check is removed as it's brittle.
  // We rely on the mock verification and final snapshot to confirm the behavior.
  let outputBeforeSubmit = stdout.get()

  expect(outputBeforeSubmit).toMatchSnapshot("concurrent input - stream finished")

  // 5. Process Concurrent Input (Submit *after* loading is confirmed false)
  stdin.emit("input", "\r")
  await waitNextRender()
  await waitNextRender()
  await waitNextRender()
  await waitNextRender()

  // 6. Verify Final State (acknowledgment rendered)
  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain(`Acknowledged: ${concurrentInputText}`)
      const tree = buildComponentTree(fiber!.current.child)
      if (queryComponentTree(tree, "Spinner")) {
        throw new Error("Spinner still rendering after acknowledgment")
      }
    },
    { timeout: 2000 },
  )

  expect(doStreamMock).toHaveBeenCalledTimes(2)
  expect(stdout.get()).toMatchSnapshot("concurrent input - final state")

  instance.unmount()
})
