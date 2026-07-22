import { config } from "@/lib/config.js"
import { queryClient } from "@/lib/query.js"
import { QueryClientProvider } from "@tanstack/react-query"
import type { Instance } from "ink"
import { render } from "ink"
import { createStore, Provider } from "jotai"
import React from "react"
import "source-map-support/register"
import { App } from "./app.js"
import { AppProvider } from "./app/context.js"

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var app: Instance
}

export async function createCoder(customConfig: typeof config, autoRunCommand?: string) {
  const store = createStore()
  const app = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppProvider
          {...customConfig}
          mcp={await Promise.all(customConfig.mcp || [])}
          customTools={customConfig.customTools || {}}
          autoRunCommand={autoRunCommand}
        >
          <App />
        </AppProvider>
      </QueryClientProvider>
    </Provider>,
    { exitOnCtrlC: false },
  )

  globalThis.app = app
  return app
}
