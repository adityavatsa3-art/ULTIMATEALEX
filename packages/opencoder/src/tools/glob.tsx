import { env } from "@/lib/env.js"
import { defineTool } from "@/tools/ai.js"
import { DefaultRejectedMessage } from "@/tools/shared/fallback-rejected-message.js"
import { type ToolMetadata } from "@/tools/tools.js"
import { globby } from "globby"
import { Text } from "ink"
import { isAbsolute } from "node:path"
import React from "react"
import { z } from "zod"

export const metadata = {
  needsPermissions: () => false,
} satisfies ToolMetadata

export const tool = defineTool({
  description: `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns`,
  parameters: z.object({
    pattern: z.string().describe("The glob pattern to match files against"),
    path: z
      .string()
      .optional()
      .describe("The directory to search in. Defaults to the current working directory."),
  }),
  generate: async function* ({ pattern, path }) {
    try {
      yield <Text>Searching...</Text>
      const absolutePath = path && isAbsolute(path) ? path : env.cwd

      const files = await globby(pattern, { cwd: absolutePath, gitignore: true })

      if (files.length === 0) {
        yield <Text>No files found</Text>
        yield "No fields found"
        return
      }
      yield <Text>Found {files.length} files</Text>
      yield files.join("\n")
    } catch (error: any) {
      yield <Text color="red">There was an error search the pattern: {error.message}</Text>
      yield `There was an error search the pattern: ${error.message}`
    }
  },
  renderTitle: ({ args }) => <Text>Searching for: {args?.pattern}</Text>,
})

export const renderRejectedMessage = DefaultRejectedMessage
