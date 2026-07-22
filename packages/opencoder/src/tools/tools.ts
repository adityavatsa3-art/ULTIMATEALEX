import type { defineTool } from "@/tools/ai.js"

type ToolContext = {}
export type ToolMetadata = {
  needsPermissions: () => boolean
}

export type ToolModule = {
  tool: ReturnType<typeof defineTool>
  metadata: ToolMetadata
  // use for simple/super fast tools
  renderRejectedMessage: () => React.ReactNode
}

export const tools = Object.fromEntries(
  Object.entries(import.meta.glob<ToolModule>("./*.tsx", { eager: true }))
    .map(([path, module]) => {
      const name = path.match(/\/([^/]+)\.tsx$/)?.[1]
      if (!name) {
        throw new Error(`Tool name not found for ${path}`)
      }
      return [name, module] as const
    })
    .filter(([_, module]) => module?.tool),
)
