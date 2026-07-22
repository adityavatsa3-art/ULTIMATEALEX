import { type LanguageModelV1StreamPart } from "ai"
import { convertArrayToReadableStream, MockLanguageModelV1 } from "ai/test"

import { waitNextRender } from "../utils/render.js"
import { setupTestEnvironment } from "./util.js"

test("handling model stream error during response generation", async () => {
  // 1. Setup model to stream partial response then error
  const errorStreamChunks: LanguageModelV1StreamPart[] = [
    { type: "text-delta", textDelta: "This is the first part. " },
    { type: "text-delta", textDelta: "Then things go wrong... " },
    // Simulate an error from the stream
    { type: "error", error: "Something went wrong during generation!" },
    // Note: A 'finish' chunk might or might not arrive after an error,
    // depending on the provider. We simulate without one here.
  ]

  const mockModel = new MockLanguageModelV1({
    doStream: async (options) => ({
      stream: convertArrayToReadableStream(errorStreamChunks),
      rawCall: { rawPrompt: JSON.stringify(options.prompt), rawSettings: {} },
    }),
  })

  const { instance, stdin, stdout, fiber } = await setupTestEnvironment({ model: mockModel })
  assert(stdin)

  expect(stdout.get()).toMatchSnapshot("stream error - initial")

  // 2. Simulate user input
  stdin.emit("input", "Trigger the error stream")
  await waitNextRender()

  // Restore waitFor to allow time for error processing and input re-enabling
  await vi.waitFor(
    () => {
      const output = stdout.get()
      // Verify input prompt is showing again
      expect(output).toContain("> ")
    },
    { timeout: 2000 },
  )

  // 4. Final state snapshot
  expect(stdout.get()).toMatchSnapshot("stream error - final state")

  // 5. Ensure app remains interactive
  stdin.emit("input", " can I type again?")
  await waitNextRender()
  expect(stdout.get()).toContain("can I type again?")

  instance.unmount()
})
