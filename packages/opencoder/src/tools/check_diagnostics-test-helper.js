import path from "node:path"
import { env } from "../lib/env.js"

export default function getTypeScriptDiagnosticsForConfig(
  mockError,
  typescript,
  version,
  source,
  tsconfigPath
) {
  try {
    throw mockError
  } catch (error) {
    if (
      error.message.includes("Option '--incremental' can only be specified") ||
      error.message.includes("Option 'incremental' can only be specified")
    ) {
      return {
        success: false,
        language: "typescript",
        version,
        source,
        errorCount: 0,
        diagnostics: [],
        error: `Configuration issue in ${path.relative(env.cwd, tsconfigPath)}: The 'incremental' option requires additional configuration. Skipping TypeScript checks.`,
        skipFurtherChecks: true, // Flag to indicate we should skip further checks
      }
    }

    return {
      success: false,
      language: "typescript",
      version,
      source,
      errorCount: 0,
      diagnostics: [],
      error: `Error checking ${path.relative(env.cwd, tsconfigPath)}: ${error.message}`,
    }
  }
}
