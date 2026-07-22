import { convertArrayToReadableStream, MockLanguageModelV1 } from "ai/test"

import { buildComponentTree } from "../utils/debugger.js"
import { queryComponentTree } from "../utils/query.js"
import { waitNextRender } from "../utils/render.js"
import { setupTestEnvironment } from "./util.js"
import { delay } from "../utils/delay"

test("user input with special characters is handled correctly", async () => {
  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  const specialInput = "Line 1\nLine 2\twith tab\nQuotes: \" ' `\nBrackets: [] {}"
  const expectedResponse = [{ type: "text-delta", textDelta: "Received special characters." }]

  doStreamMock.mockImplementationOnce(async (options) => {
    const messages = options.prompt
    const userMessage = Array.isArray(messages)
      ? messages.find((m) => m.role === "user")
      : undefined
    expect(
      userMessage,
      `User message not found in received messages: ${JSON.stringify(messages)}`,
    ).toBeDefined()
    expect(userMessage?.content[0]?.text).toBe(specialInput)

    return {
      stream: convertArrayToReadableStream([
        ...expectedResponse,
        { type: "finish", finishReason: "stop", usage: { promptTokens: 20, completionTokens: 5 } },
      ]),
      rawCall: { rawPrompt: JSON.stringify(messages), rawSettings: {} },
      type: "finish",
      finishReason: "stop",
      usage: { promptTokens: 20, completionTokens: 5 },
    }
  })

  const { instance, stdin, stdout, fiber } = await setupTestEnvironment({ model: mockModel })
  assert(stdin)

  // 2. Simulate user input containing special characters
  stdin.emit("input", specialInput)
  await delay(50)
  await waitNextRender()

  // 3. Verify the input is displayed correctly in the UI *before* sending
  const treeBeforeSend = buildComponentTree(fiber!.current.child)
  const textInputNode = queryComponentTree(treeBeforeSend, "TextInput")
  expect(textInputNode).not.toBeNull()
  expect(textInputNode?.props?.value).toBe(specialInput)
  expect(stdout.get()).toMatchSnapshot("special chars - input displayed")

  // Simulate Send
  stdin.emit("input", "\r")
  await waitNextRender()

  // 5. Wait for model response and check rendering
  await vi.waitFor(
    () => {
      const tree = buildComponentTree(fiber!.current.child)
      if (queryComponentTree(tree, "Spinner")) {
        throw new Error("Spinner still rendering")
      }
      expect(stdout.get()).toContain("Received special characters.")
    },
    { timeout: 1000 },
  )

  expect(doStreamMock).toHaveBeenCalledTimes(1)
  expect(stdout.get()).toMatchSnapshot("special chars - final state")

  instance.unmount()
})
