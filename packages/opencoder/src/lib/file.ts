import { logError } from "@/lib/log.js"
import { fileTypeFromFile } from "file-type"

import {
  readFileSync,
  writeFileSync,
  openSync,
  readSync,
  closeSync,
  existsSync,
  readdirSync,
  opendirSync,
} from "fs"
import {
  isAbsolute,
  normalize,
  resolve,
  resolve as resolvePath,
  relative,
  sep,
  basename,
  dirname,
  extname,
  join,
} from "path"

export function findSimilarFile(filePath: string): string | undefined {
  try {
    const dir = dirname(filePath)
    const fileBaseName = basename(filePath, extname(filePath))

    // Check if directory exists
    if (!existsSync(dir)) {
      return undefined
    }

    // Get all files in the directory
    const files = readdirSync(dir)

    // Find files with the same base name but different extension
    const similarFiles = files.filter(
      (file) => basename(file, extname(file)) === fileBaseName && join(dir, file) !== filePath,
    )

    // Return just the filename of the first match if found
    const firstMatch = similarFiles[0]
    if (firstMatch) {
      return firstMatch
    }
    return undefined
  } catch (error) {
    // In case of any errors, return undefined
    logError(`Error finding similar file for ${filePath}: ${error}`)
    return undefined
  }
}

export function addLineNumbers({
  content,
  // 1-indexed
  startLine,
}: {
  content: string
  startLine: number
}): string {
  if (!content) {
    return ""
  }

  return content
    .split(/\r?\n/)
    .map((line, index) => {
      const lineNum = index + startLine
      const numStr = String(lineNum)
      // Handle large numbers differently
      if (numStr.length >= 6) {
        return `${numStr}\t${line}`
      }
      // Regular numbers get padding to 6 characters
      const n = numStr.padStart(6, " ")
      return `${n}\t${line}`
    })
    .join("\n") // TODO: This probably won't work for Windows
}

export async function readTextContent(
  filePath: string,
  offset = 0,
  maxLines?: number,
): Promise<{ content: string; lineCount: number; totalLines: number }> {
  const content = readFileSync(filePath, "utf-8")
  const lines = content.split(/\r?\n/)

  // Truncate number of lines if needed
  const toReturn =
    maxLines !== undefined && lines.length - offset > maxLines
      ? lines.slice(offset, offset + maxLines)
      : lines.slice(offset)

  return {
    content: toReturn.join("\n"),
    lineCount: toReturn.length,
    totalLines: lines.length,
  }
}
