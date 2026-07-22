import { join, dirname } from "node:path"
import { existsSync } from "node:fs"
import $ from "dax-sh"

export function findNearestPackageJson(dir: string): string | null {
  const packageJsonPath = join(dir, "package.json")
  const gitPath = join(dir, ".git")
  const coderJsonPath = join(dir, ".coder/CODER.md")
  const pythonPath = join(dir, "pyproject.toml")
  const poetryPath = join(dir, "poetry.lock")
  if (
    existsSync(packageJsonPath) ||
    existsSync(coderJsonPath) ||
    existsSync(pythonPath) ||
    existsSync(poetryPath) ||
    existsSync(gitPath)
  ) {
    return dir
  }

  const parentDir = dirname(dir)

  // Return null if the root directory has been reached
  if (parentDir === dir) {
    return null
  }

  return findNearestPackageJson(parentDir)
}

export const env = {
	isCI: Boolean(process.env.CI),
	platform:
		process.platform === "win32"
			? "windows"
			: process.platform === "darwin"
				? "macos"
				: "linux",
	nodeVersion: process.version,
	terminal: process.env.TERM_PROGRAM,
	cwd: findNearestPackageJson(process.cwd()) || process.cwd(),
}

export const coderDir = join(env.cwd!, ".coder")

$.cd(env.cwd!)
