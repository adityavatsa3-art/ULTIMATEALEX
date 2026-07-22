import { QueryClient } from "@tanstack/react-query"
import { onCommitFiberRoot, type FiberRoot } from "bippy"
import { createStore } from "jotai"

import type { AppContextType } from "../../src/app/context.js"
import { autoAcceptToolsAtom } from "../../src/lib/store/tool-confirmation.js"
import { buildComponentTree } from "../utils/debugger.js"
import { queryComponentTree } from "../utils/query.js"
import { waitNextRender } from "../utils/render.js"
import { createAppTestWrapper } from "../utils/wrapper.js"
import { createMockModel, setupTestEnvironment } from "./util.custom.js"
import { tool, type ToolResultPart } from "ai"
import { z } from "zod"
import { convertArrayToReadableStream, MockLanguageModelV1 } from "ai/test"
import React from "react"
import { delay } from "../utils/delay.js"
import { Box, Text } from "ink"

test("chat interaction with a custom tool rendering UI", async () => {
  const toolDefinition = tool({
    description: "Get the current time",
    parameters: z.object({}),
    execute: async () => ({ time: new Date().toLocaleTimeString() }),
  })

  const toolWithGenerate = {
    ...toolDefinition,
    generate: async function* () {
      yield <Text color="yellow">Fetching time...</Text>

      await delay(500)

      const currentTime = "12:00:00"

      yield (
        <Box borderStyle="round" borderColor="green" paddingX={1}>
          <Text>Current Time: {currentTime}</Text>
        </Box>
      )

      yield { time: currentTime }
    },
  }

  const tools = {
    get_current_time: toolWithGenerate,
  }

  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "tool-call",
        toolCallId: "tool_time_1",
        toolName: "get_current_time",
        args: JSON.stringify({}),
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 10, completionTokens: 5 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  doStreamMock.mockImplementationOnce(async (options) => {
    const messages = options.prompt
    const toolMessage = messages.find((m: any) => m.role === "tool")
    const toolResult = toolMessage?.content?.[0] as ToolResultPart | undefined

    expect(toolResult?.toolCallId).toBe("tool_time_1")
    expect(toolResult?.result).toBeDefined()
    expect(toolResult?.result).toHaveProperty("time")

    return {
      stream: convertArrayToReadableStream([
        { type: "text-delta", textDelta: "OK, I got the time." },
        {
          type: "finish",
          finishReason: "stop",
          usage: { promptTokens: 20, completionTokens: 5 },
        },
      ]),
      rawCall: { rawPrompt: JSON.stringify(messages), rawSettings: {} },
    }
  })

  const store = createStore()
  store.set(autoAcceptToolsAtom, ["get_current_time"])

  const { instance, stdin, stdout, fiber } = await setupTestEnvironment({
    model: mockModel,
    customTools: tools,
  }, {}, store)

  expect(stdout.get()).toMatchSnapshot("custom tool gen ui - initial")
  assert(stdin)

  stdin.emit("input", "What time is it?")
  await waitNextRender()
  stdin.emit("input", "\r")

  await waitNextRender()
  await waitNextRender()
  await waitNextRender()
  await waitNextRender()

  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain("OK, I got the time.")
      const tree = buildComponentTree(fiber!.current.child)
      if (queryComponentTree(tree, "Spinner")) {
        throw new Error("Spinner still rendering after final AI response")
      }
    },
    { timeout: 1000 },
  )

  expect(doStreamMock).toHaveBeenCalledTimes(2)
  expect(stdout.get()).toMatchSnapshot("custom tool gen ui - final state")

  instance.unmount()
})
