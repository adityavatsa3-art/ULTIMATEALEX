import { QueryClient } from "@tanstack/react-query"
import { type LanguageModelV1StreamPart } from "ai"
import { convertArrayToReadableStream, MockLanguageModelV1 } from "ai/test"
import { onCommitFiberRoot, type FiberRoot } from "bippy"
import { createStore } from "jotai"
import { delay } from "../utils/delay.js"
import { waitNextRender } from "../utils/render.js"
import type { AppContextType } from "../../src/app/context.js"
import { createAppTestWrapper } from "../utils/wrapper.js"

export async function* simulateDelayedStream(
  chunks: LanguageModelV1StreamPart[],
  delayMs: number,
): AsyncGenerator<LanguageModelV1StreamPart> {
  for (const chunk of chunks) {
    await delay(delayMs)
    yield chunk
  }
}

// Helper to convert async generator to ReadableStream
export function convertGeneratorToReadableStream<T>(
  generator: AsyncGenerator<T>,
): ReadableStream<T> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await generator.next()
      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}

export function createMockModel(streamChunks: Array<any>) {
  return new MockLanguageModelV1({
    doStream: async ({ prompt }) => ({
      stream: convertArrayToReadableStream(streamChunks),
      rawCall: { rawPrompt: JSON.stringify(prompt), rawSettings: {} },
      ...(streamChunks.find((chunk) => chunk.type === "finish") || {
        type: "finish",
        finishReason: "stop",
        usage: { completionTokens: 10, promptTokens: 3 },
      }),
    }),
  })
}

export async function setupTestEnvironment(
  configOverrides: Partial<AppContextType> = {},
  options: { streamChunks?: any[] } = {},
) {
  let fiber: FiberRoot | undefined
  onCommitFiberRoot((root) => {
    fiber = root
  })
  const store = createStore()
  const queryClient = new QueryClient()

  // Create a default mock model, potentially overridden later
  const defaultModel = createMockModel(
    options.streamChunks ?? [{ type: "text-delta", textDelta: "Default response" }],
  )

  const defaultConfig: AppContextType = {
    model: defaultModel,
    mcp: [],
    customTools: {},
    config: {
      tools: {},
    },
    flags: {},
    session: {
      id: "test-session",
      messages: [],
      startTime: new Date(),
      lastUpdateTime: new Date(),
    },
  }

  // Deep merge might be needed for nested objects like config.tools if overrides get complex
  const config: AppContextType = {
    ...defaultConfig,
    ...configOverrides,
    mcp: [...(defaultConfig.mcp || []), ...(configOverrides.mcp || [])],
    customTools: {
      ...defaultConfig.customTools,
      ...configOverrides.customTools,
    },
    config: {
      ...defaultConfig.config,
      ...configOverrides.config,
      tools: {
        ...defaultConfig.config?.tools,
        ...configOverrides.config?.tools,
      },
    },
    flags: {
      ...defaultConfig.flags,
      ...configOverrides.flags,
    },
    session: configOverrides.session
      ? { ...defaultConfig.session, ...configOverrides.session }
      : defaultConfig.session,
    model: configOverrides.model ?? defaultConfig.model,
  }

  const wrapper = await createAppTestWrapper({ config, store, queryClient })

  await waitNextRender()

  return { ...wrapper, fiber, store, queryClient, config }
}
