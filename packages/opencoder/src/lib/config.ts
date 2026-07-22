import type { Config } from "@/lib.js"
import { env } from "@/lib/env.js"
import { resolve } from "node:path"
import { createJiti } from "jiti"
import { anthropic, createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAICompatible as createOpenAICompatible2 } from "@ai-sdk/openai-compatible"
import { createGoogleGenerativeAI, google } from "@ai-sdk/google"
import { createOpenAI as createOpenAI2, openai, type OpenAIProvider } from "@ai-sdk/openai"
import { z } from "zod"
// import { loadConfig } from "unconfig"

// const { config, sources } = await loadConfig<Config>({
//   sources: [
//     // load from `my.config.xx`
//     {
//       files: "coder.config",
//       // default extensions
//       extensions: ["ts", "mts", "cts", "js", "mjs", "cjs", "jsx", "tsx", "json", ""],
//     },
//     // load `my` field in `package.json` if no above config files found
//     {
//       files: "package.json",
//       extensions: [],
//       rewrite(config: any) {
//         return config?.coder
//       },
//     },
//   ],
//   merge: false,
//   defaults: {},
// })

// export { config }

declare global {
  var openai: OpenAIProvider
  var createOpenAI: typeof createOpenAI2
  var createOpenAICompatible: typeof createOpenAICompatible2
  var createGoogleGenerativeAI: any
  var google: any
  var z: any
  var anthropic: any
  var createAnthropic: any
}

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  // fsCache: false,
  // moduleCache: false,
})

const loadConfig = (path: string) => {
  // if (typeof Bun !== "undefined") {
  //   return import(resolve(env.cwd, path)).catch(() => false)
  // }
  return jiti
    .import<{ default: Config }>(resolve(env.cwd, path))
    .then((e) => e.default)
    .catch((e) => {
      return false
    })
}

globalThis.z = z
globalThis.openai = openai
globalThis.createOpenAI = createOpenAI2
globalThis.anthropic = anthropic
globalThis.createAnthropic = createAnthropic
globalThis.createOpenAICompatible = createOpenAICompatible2
globalThis.createGoogleGenerativeAI = createGoogleGenerativeAI
globalThis.google = google

export const config = ((await loadConfig(`${env.cwd}/coder.config.ts`)) ||
  (await loadConfig(`${env.cwd}/coder.config.js`)) ||
  (await loadConfig(`${env.cwd}/coder.config.tsx`)) ||
  {}) as Config
