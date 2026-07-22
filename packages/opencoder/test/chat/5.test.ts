import { tool } from "ai"
import { convertArrayToReadableStream, MockLanguageModelV1 } from "ai/test"

import { z } from "zod"
import { waitNextRender } from "../utils/render.js"
import { setupTestEnvironment } from "./util.js"

// Define expected strings for assertions
const toolFailureErrorMessage =
  "Error executing tool failing_tool: Tool execution failed spectacularly!"
const inputPromptIndicator = ">"

test("handling tool execution error", async () => {
  // 1. Setup: Model requests a tool, tool execution fails
  const mockFailingTool = vi
    .fn()
    .mockRejectedValue(new Error("Tool execution failed spectacularly!"))

  const tools = {
    failing_tool: tool({
      execute: mockFailingTool,
      description: "A tool designed to fail",
      parameters: z.object({ param: z.string() }),
    }),
  }

  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  // Model requests the failing tool
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "tool-call",
        toolCallId: "tool_fail_1",
        toolName: "failing_tool",
        args: JSON.stringify({ param: "someValue" }),
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 5, completionTokens: 5 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
    type: "finish",
    finishReason: "tool-calls",
    usage: { promptTokens: 5, completionTokens: 5 },
  }))

  // Model should *not* be called again after tool failure in this flow
  // (The error message is generated client-side)

  const { instance, stdin, stdout, fiber, config } = await setupTestEnvironment({
    model: mockModel,
    customTools: tools,
  })

  // Check initial state - should only have input prompt
  const initialOutput = stdout.get()
  expect(initialOutput).includes(inputPromptIndicator)
  expect(initialOutput).not.includes(toolFailureErrorMessage)

  assert(stdin)

  // 2. Simulate user input
  stdin.emit("input", "Run the failing tool")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()
  await waitNextRender()
  await waitNextRender()

  // Restore waitFor to allow the app time to process the tool call and handle the rejection
  await vi.waitFor(
    () => {
      const output = stdout.get()
      // Check that the specific error message IS present
      expect(output).includes(toolFailureErrorMessage)
      // Check that the input prompt reappears
      expect(output).includes(inputPromptIndicator)
    },
    { timeout: 3000 },
  )

  // 5. Verify tool was called
  expect(mockFailingTool).toHaveBeenCalledTimes(1)
  expect(mockFailingTool.mock.calls[0][0]).toEqual({ param: "someValue" })

  // 6. Verify model was NOT called a second time
  expect(doStreamMock).toHaveBeenCalledTimes(1)

  // 7. Final state check - already partially done in waitFor, but can re-verify
  const finalOutput = stdout.get()
  expect(finalOutput).includes(toolFailureErrorMessage)
  expect(finalOutput).includes(inputPromptIndicator)

  // 8. Ensure app is stable and ready for next input
  stdin.emit("input", "next message")
  await waitNextRender()
  expect(stdout.get()).toContain("next message")

  instance.unmount()
})
