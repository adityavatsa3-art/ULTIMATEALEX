import { QueryClient } from "@tanstack/react-query"
import { onCommitFiberRoot, type FiberRoot } from "bippy"
import { createStore } from "jotai"

import type { AppContextType } from "../../src/app/context.js"
import { buildComponentTree } from "../utils/debugger.js"
import { queryComponentTree } from "../utils/query.js"
import { waitNextRender } from "../utils/render.js"
import { createAppTestWrapper } from "../utils/wrapper.js"
import { createMockModel } from "./util.js"

test("simple chat", async () => {
  let fiber: FiberRoot | undefined
  onCommitFiberRoot((root) => {
    fiber = root
  })
  const store = createStore()
  const queryClient = new QueryClient()
  const config = {
    model: createMockModel([
      { type: "text-delta", textDelta: "Hello" },
      { type: "text-delta", textDelta: ", " },
      { type: "text-delta", textDelta: `world!` },
      {
        type: "finish",
        finishReason: "stop",
        logprobs: undefined,
        usage: { completionTokens: 10, promptTokens: 3 },
      },
    ]),
    mcp: [],
  } satisfies AppContextType
  const { instance, stdin, stdout } = await createAppTestWrapper({ config, store, queryClient })

  await waitNextRender()
  expect(fiber).toBeDefined()
  assert(stdin)
  expect(stdout.get()).toMatchSnapshot("simple chat initial")

  stdin.emit("input", "hello world")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()
  await vi.waitFor(
    () => {
      const tree = buildComponentTree(fiber!.current.child)
      if (queryComponentTree(tree, "Spinner")) {
        throw new Error("Spinner is still in the tree")
      }
    },
    { interval: 10 },
  )

  expect(stdout.get()).toMatchSnapshot("simple chat")

  instance.unmount()
})
