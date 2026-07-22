import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from "fs"
import { join } from "path"
import { z } from "zod"
import { defineTool } from "@/tools/ai.js"
import { coderDir } from "@/lib/env.js"
import { Text } from "ink"
import React from "react"

export const metadata = {}

const MEMORY_DIR = join(coderDir, "memory")

export const tool = defineTool({
  description: "Read from memory files stored on disk",

  parameters: z.object({
    file_path: z.string().optional().describe("Optional path to a specific memory file to read"),
  }),

  execute: async ({ file_path }) => {
    mkdirSync(MEMORY_DIR, { recursive: true })

    // If a specific file is requested, return its contents
    if (file_path) {
      const fullPath = join(MEMORY_DIR, file_path)
      if (!fullPath.startsWith(MEMORY_DIR)) {
        throw new Error("Invalid memory file path")
      }
      if (!existsSync(fullPath)) {
        throw new Error("Memory file does not exist")
      }
      const content = readFileSync(fullPath, "utf-8")
      return { content }
    }

    // Otherwise return the index and file list
    const files = readdirSync(MEMORY_DIR, { recursive: true })
      .map((f) => join(MEMORY_DIR, f.toString()))
      .filter((f) => !lstatSync(f).isDirectory())
      .map((f) => `- ${f}`)
      .join("\n")

    const indexPath = join(MEMORY_DIR, "index.md")
    const index = existsSync(indexPath) ? readFileSync(indexPath, "utf-8") : ""

    const quotes = "'''"
    const content = `Here are the contents of the root memory file, \`${indexPath}\`:
${quotes}
${index}
${quotes}

Files in the memory directory:
${files}`

    return { content }
  },
  render: ({ args }) => {
    return <Text>Read memory file: {args.file_path}</Text>
  },
})
