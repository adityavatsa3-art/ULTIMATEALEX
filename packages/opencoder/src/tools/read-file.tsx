import { env } from "@/lib/env.js"
import { addLineNumbers, findSimilarFile, readTextContent } from "@/lib/file.js"
import { defineTool, type Renderer } from "@/tools/ai.js"
import { type ToolMetadata } from "@/tools/tools.js"
import { Text } from "ink"
import { existsSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import React from "react"
import { z } from "zod"

export const metadata = {
  needsPermissions: () => false,
} satisfies ToolMetadata

const MAX_LINE_LENGTH = 2000
const MAX_LINES_TO_READ = 1000
export const tool = defineTool({
	description: `Reads a file from the local filesystem. The file_path parameter must be an absolute path, not a relative path. By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file. You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated. For image files, the tool will display the image for you.`,
	parameters: z.strictObject({
		filePath: z
			.string()
			.describe("The absolute path to the file to read (eg src/app/chat.tsx)"),
		offset: z
			.number()
			.optional()
			.describe(
				"The line number to start reading from. Only provide if the file is too large to read at once",
			),
		limit: z
			.number()
			.optional()
			.describe(
				"The number of lines to read. Only provide if the file is too large to read at once.",
			),
	}),
	execute: async ({ filePath, offset = 1, limit }) => {
		const fullFilePath = existsSync(filePath)
			? filePath
			: resolve(env.cwd!, filePath)

		if (!existsSync(fullFilePath)) {
			// Try to find a similar file with a different extension
			const similarFilename = findSimilarFile(fullFilePath)
			let message = "File does not exist."

			// If we found a similar file, suggest it to the assistant
			if (similarFilename) {
				message += ` Did you mean ${similarFilename}?`
			}

			return {
				result: false,
				message,
			}
		}

		const { content, lineCount, totalLines } = await readTextContent(
			fullFilePath,
			offset,
			limit,
		)

		return {
			data: addLineNumbers({ content, startLine: offset }),
			metadata: {
				lineCount,
				totalLines,
			},
		}
	},
	render: ({ args }) => {
		return <Text>Read {args.filePath}</Text>
	},
})

export const renderRejectedMessage = () => {
  return <Text>Read File</Text>
}
