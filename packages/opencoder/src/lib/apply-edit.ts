import { env } from "@/lib/env.js"
import { isAbsolute, resolve } from "path"
import { readFileSync } from "fs"
import { type Hunk } from "diff"
import { getPatch } from "./diff.js"

export function applyEdit(
  filePath: string,
  oldString: string,
  newString: string,
): { patch: Hunk[]; updatedFile: string } {
  const fullFilePath = isAbsolute(filePath) ? filePath : resolve(env.cwd, filePath)

  let originalFile
  let updatedFile
  if (oldString === "") {
    // Create new file
    originalFile = ""
    updatedFile = newString
  } else {
    // Edit existing file
    originalFile = readFileSync(fullFilePath, "utf-8")
    if (newString === "") {
      if (!oldString.endsWith("\n") && originalFile.includes(oldString + "\n")) {
        updatedFile = originalFile.replace(oldString + "\n", () => newString)
      } else {
        updatedFile = originalFile.replace(oldString, () => newString)
      }
    } else {
      updatedFile = originalFile.replace(oldString, () => newString)
    }
    if (updatedFile === originalFile) {
      throw new Error("Original and edited file match exactly. Failed to apply edit.")
    }
  }

  const patch = getPatch({
    filePath: filePath,
    fileContents: originalFile,
    oldStr: originalFile,
    newStr: updatedFile,
  })

  return { patch, updatedFile }
}
