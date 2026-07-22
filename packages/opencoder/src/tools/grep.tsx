import { stat } from "fs/promises"
import { z } from "zod"
import { defineTool } from "@/tools/ai.js"
import { rgPath } from "@vscode/ripgrep"
import { isAbsolute } from "path"
import { env } from "@/lib/env.js"
import { spawnSync } from "child_process"
import React from "react"
import { Text } from "ink"

const MAX_RESULTS = 100

export const tool = defineTool({
  description: `
- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files containing specific patterns
`,
  parameters: z.object({
    pattern: z.string().describe("The regular expression pattern to search for in file contents"),
    path: z
      .string()
      .optional()
      .describe("The directory to search in. Defaults to the current working directory."),
    include: z
      .string()
      .optional()
      .describe('File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")'),
  }),
  generate: async function* ({ pattern, path, include }) {
    try {
      yield <Text>Searching...</Text>
      const absolutePath = path && isAbsolute(path) ? path : env.cwd

      const args = ["-li", pattern]
      if (include) {
        args.push("--glob", include)
      }

      // TODO handle signal
      const rgResults = spawnSync(rgPath, args, { cwd: absolutePath, timeout: 10000 })
      const results = rgResults.stdout?.toString().split("\n") || []

      const stats = await Promise.all(results.filter((_) => _).map((_) => stat(_)))
      const matches = results
        // Sort by modification time
        .map((_, i) => [_, stats[i]!] as const)
        .sort((a, b) => {
          const timeComparison = (b[1].mtimeMs ?? 0) - (a[1].mtimeMs ?? 0)
          if (timeComparison === 0) {
            return a[0].localeCompare(b[0])
          }
          return timeComparison
        })
        .map((_) => _[0])

      if (matches.length === 0) {
        yield <Text>No files found</Text>
        yield `No files found`
        return
      }

      let result = `Found ${matches.length} file${matches.length === 1 ? "" : "s"}\n${matches.slice(0, MAX_RESULTS).join("\n")}`
      if (matches.length > MAX_RESULTS) {
        result += "\n(Results are truncated. Consider using a more specific path or pattern.)"
      }
      yield (
        <Text>
          Found {matches.length} file{matches.length === 1 ? "" : "s"}
        </Text>
      )
      yield result
    } catch (error: any) {
      yield <Text color="red">There was an error searching for the pattern: {error.message}</Text>
      yield `Error: ${error.message}`
    }
  },
  renderTitle: (tool) => {
    return <Text>Grep: {tool.args.pattern}</Text>
  },
  render: (tool) => {
    if (tool.state === "result") {
      return <Text>Found </Text>
    }
  },
})
