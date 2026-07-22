import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { z } from "zod"
import { defineTool } from "@/tools/ai.js"
import { coderDir } from "@/lib/env.js"
import { Text } from "ink"
import React from "react"

const MEMORY_DIR = join(coderDir, "memory")

export const tool = defineTool({
  description: "Write content to a memory file",
  parameters: z.object({
    file_path: z.string().describe("Path to the memory file to write"),
    content: z.string().describe("Content to write to the file"),
  }),
  execute: async ({ file_path, content }) => {
    const fullPath = join(MEMORY_DIR, file_path)
    if (!fullPath.startsWith(MEMORY_DIR)) {
      throw new Error("Invalid memory file path")
    }

    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, content, "utf-8")

    return "Memory file written successfully"
  },
  render: ({ args }) => {
    return <Text>Update memory file: {args.file_path}</Text>
  },
})
