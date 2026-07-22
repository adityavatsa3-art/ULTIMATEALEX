
import { buildComponentTree } from "../utils/debugger.js"
import { queryComponentTree } from "../utils/query.js"
import { waitNextRender } from "../utils/render.js"
import { createMockModel, setupTestEnvironment } from "./util.js"

test("long streaming response renders incrementally and completely", async () => {
  // 1. Setup model with many chunks
  const streamChunks: any[] = []
  const totalChunks = 30
  let fullMessage = ""
  for (let i = 0; i < totalChunks; i++) {
    const text = `Chunk ${i + 1}. `
    streamChunks.push({ type: "text-delta", textDelta: text })
    fullMessage += text
  }
  streamChunks.push({
    type: "finish",
    finishReason: "stop",
    usage: { promptTokens: 5, completionTokens: totalChunks },
  })

  const mockModel = createMockModel(streamChunks)

  const { instance, stdin, stdout, fiber } = await setupTestEnvironment({ model: mockModel })
  assert(stdin)

  // 2. Simulate user input
  stdin.emit("input", "Tell me a long story")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()

  // 3. Observe intermediate states (optional but good for debugging)
  let intermediateOutput = ""
  await vi.waitFor(
    () => {
      intermediateOutput = stdout.get()
      expect(intermediateOutput).toContain("Chunk 1.")
      expect(intermediateOutput).toContain("Chunk 5.")
    },
    { timeout: 500 },
  )

  // 4. Wait for the stream to finish completely
  await vi.waitFor(
    () => {
      const tree = buildComponentTree(fiber!.current.child)
      if (queryComponentTree(tree, "Spinner")) {
        throw new Error("Spinner still rendering")
      }
      const finalOutput = stdout.get()
      expect(finalOutput).toContain("Chunk 1.")
      expect(finalOutput).toContain(`Chunk ${Math.floor(totalChunks / 2)}.`)
    },
    { timeout: 2000 },
  )

  // 5. Verify final output snapshot
  expect(stdout.get()).toMatchSnapshot("long stream - final state")
})
