import { convertArrayToReadableStream, MockLanguageModelV1 } from "ai/test"
import { buildComponentTree } from "../utils/debugger.js"
import { queryComponentTree } from "../utils/query.js"
import { waitNextRender } from "../utils/render.js"
import { setupTestEnvironment } from "./util.js"
import type { LanguageModelV1StreamPart } from "ai"

test("multi-turn conversation maintains context correctly", async () => {
  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()

  // Fix: Explicitly type the turns array and ensure correct stream part types
  const turns: Array<{
    userInput: string
    aiResponse: LanguageModelV1StreamPart[]
    expectedRoleSequence: Array<"user" | "assistant">
  }> = [
    {
      userInput: "Hello",
      aiResponse: [{ type: "text-delta", textDelta: "Hi there!" }],
      expectedRoleSequence: ["user"],
    },
    {
      userInput: "How are you?",
      aiResponse: [{ type: "text-delta", textDelta: "I am an AI, I have no feelings." }],
      expectedRoleSequence: ["user", "assistant", "user"],
    },
    {
      userInput: "Tell me a joke.",
      aiResponse: [
        { type: "text-delta", textDelta: "Why don't scientists trust atoms?" },
        { type: "text-delta", textDelta: " Because they make up everything!" },
      ],
      expectedRoleSequence: ["user", "assistant", "user", "assistant", "user"],
    },
  ]

  let messageHistory: any[] = []
  let turnCounter = 0

  // Revert: Cannot use mockImplementationOnce on the model property directly.
  // Use a single implementation that tracks turns internally.
  mockModel.doStream = doStreamMock.mockImplementation(async (options) => {
    const messages = options.prompt
    const currentTurnIndex = turnCounter
    turnCounter++

    // Verify message history based on the current turn index
    // Build the expected history *up to* this point dynamically
    const expectedHistory: Array<{ role: "user" | "assistant"; content: string }> = []
    for (let i = 0; i < currentTurnIndex; i++) {
      expectedHistory.push({ role: "user", content: turns[i].userInput })
      const prevResponse = turns[i]?.aiResponse ?? []
      const prevFullResponse = Array.isArray(prevResponse)
        ? prevResponse
            .filter((c) => c.type === "text-delta")
            .map((c) => c.textDelta)
            .join("")
        : ""
      expectedHistory.push({ role: "assistant", content: prevFullResponse })
    }
    // Add the *current* user message which triggered this call
    expectedHistory.push({ role: "user", content: turns[currentTurnIndex].userInput })

    const relevantMessages = messages.filter((m) => m.role !== "system")

    // Fix: Adjust assertion to handle content structure mismatch
    expect(relevantMessages.length).toEqual(expectedHistory.length)
    // Compare relevant fields, normalizing content structure
    relevantMessages.forEach((msg, index) => {
      const expectedMsg = expectedHistory[index]
      expect(msg.role).toEqual(expectedMsg.role)
      // Normalize actual message content if it's an array
      const actualContent =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content) && msg.content[0]?.type === "text"
            ? msg.content[0].text
            : JSON.stringify(msg.content)
      expect(actualContent).toEqual(expectedMsg.content)
    })

    // Get response for the current turn
    const responseStreamParts = turns[currentTurnIndex]?.aiResponse ?? []
    const fullResponse = Array.isArray(responseStreamParts)
      ? responseStreamParts
          .filter((c) => c.type === "text-delta")
          .map((c) => c.textDelta)
          .join("")
      : ""

    // Update history *after* checks, reflecting the current user message and the upcoming AI response
    // This updated history will be used by the *next* call's assertion
    messageHistory.push({ role: "user", content: turns[currentTurnIndex].userInput })
    messageHistory.push({ role: "assistant", content: fullResponse })

    // Construct the final stream parts including the finish reason
    const finalStreamParts: LanguageModelV1StreamPart[] = [
      ...(Array.isArray(responseStreamParts) ? responseStreamParts : []),
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 10 },
      },
    ]

    return {
      stream: convertArrayToReadableStream(finalStreamParts),
      rawCall: { rawPrompt: JSON.stringify(messages), rawSettings: {} },
    }
  })

  const { instance, stdin, stdout, fiber } = await setupTestEnvironment({ model: mockModel })
  assert(stdin)

  // Simulate the conversation turns
  messageHistory = []
  for (const turn of turns) {
    stdin.emit("input", turn.userInput)
    await waitNextRender()
    stdin.emit("input", "\r")
    await waitNextRender()

    await vi.waitFor(
      () => {
        const tree = buildComponentTree(fiber!.current.child)
        if (queryComponentTree(tree, "Spinner")) {
          throw new Error("Spinner still rendering")
        }
        const lastAiResponse = turn.aiResponse
          .filter((c) => c.type === "text-delta")
          .map((c) => c.textDelta)
          .join("")
        expect(stdout.get()).toContain(lastAiResponse)
      },
      { timeout: 1000 },
    )
  }

  // Final check
  expect(doStreamMock).toHaveBeenCalledTimes(turns.length)
  expect(stdout.get()).toMatchSnapshot("multi-turn - final state")
})
