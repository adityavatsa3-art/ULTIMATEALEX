import { Box, Text } from "ink"
import React from "react"
import type { ToolMetadata } from "@/tools/tools.js"
import { env } from "@/lib/env.js"
import { defineTool } from "@/tools/ai.js"
import { DefaultRejectedMessage } from "@/tools/shared/fallback-rejected-message.js"
import { z } from "zod"
import path from "node:path"
import {
  createDefaultMapFromNodeModules,
  createFSBackedSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs"
import { existsSync, readFileSync } from "node:fs"
import { globby } from "globby"

export function handleIncrementalError(error: any): boolean {
  return (
    error.message.includes("Option '--incremental' can only be specified") ||
    error.message.includes("Option 'incremental' can only be specified")
  )
}

// Add global type declaration for tsconfigPaths
declare global {
  var __tsconfigPaths: string[]
}

type DiagnosticResult = {
  success: boolean
  language: string
  version: string
  source: string
  errorCount: number
  diagnostics: Array<{
    filePath: string
    line: number
    column: number
    message: string
  }>
  error?: string
  configPath?: string
  configCount?: number
  skipFurtherChecks?: boolean // Flag to indicate if further checks should be skipped
}

type VFSValidationResult = {
  success: boolean
  error?: {
    message: string
  }
}

export const metadata = {
  needsPermissions: () => false,
} satisfies ToolMetadata

async function validateVFS(typescript: typeof import("typescript")): Promise<VFSValidationResult> {
  try {
    // Basic VFS validation logic
    // Create a simple test environment to verify VFS is working
    const testOptions = { target: typescript.ScriptTarget.ES2015 }
    const testSystem = createFSBackedSystem(new Map(), env.cwd!, typescript)
    const testEnv = createVirtualTypeScriptEnvironment(testSystem, [], typescript, testOptions)

    // If we can create a program, VFS is working
    return { success: !!testEnv.languageService.getProgram() }
  } catch (error: any) {
    return { success: false, error: { message: error.message || "Unknown error" } }
  }
}

export async function resolveTypeScript(): Promise<
  { typescript: any; version: string; source: string } | { error: Error }
> {
  try {
    // Try to load project's TypeScript first
    const projectTsPath = path.join(env.cwd!, "node_modules/typescript")
    if (existsSync(projectTsPath)) {
      const ts = await import(projectTsPath)
      return { typescript: ts, version: ts.version, source: "local" }
    }

    // Fall back to bundled TypeScript
    const ts = await import("typescript")
    return { typescript: ts, version: ts.version, source: "bundled" }
  } catch (error: any) {
    return { error }
  }
}

export async function isTypeScriptProject(): Promise<{
  isTypeScript: boolean
  tsconfigPaths: string[]
}> {
  const result = { isTypeScript: false, tsconfigPaths: [] as string[] }

  // Check for root tsconfig.json
  const rootTsconfigPath = path.join(env.cwd!, "tsconfig.json")
  if (existsSync(rootTsconfigPath)) {
    result.isTypeScript = true
    result.tsconfigPaths.push(rootTsconfigPath)
  }

  // Check for TypeScript in package.json dependencies
  const packageJsonPath = path.join(env.cwd!, "package.json")
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))
      const hasTsDep =
        packageJson.dependencies?.typescript ||
        packageJson.devDependencies?.typescript ||
        packageJson.peerDependencies?.typescript

      if (hasTsDep) {
        result.isTypeScript = true
      }
    } catch (error) {
      // Ignore package.json parsing errors
    }
  }

  // Handle monorepo structures - check common patterns
  const monorepoPatterns = [
    // Yarn/npm/pnpm workspace pattern
    "apps/*/tsconfig.json",
    "packages/*/tsconfig.json",
    // Other common patterns
    "*/tsconfig.json",
    "*/*/tsconfig.json",
    // Web subfolder in non-TS projects
    "web/tsconfig.json",
    "frontend/tsconfig.json",
    "client/tsconfig.json",
  ]

  // Use globby to find all tsconfig.json files
  const tsconfigFiles = await globby(monorepoPatterns, {
    cwd: env.cwd!,
    absolute: true,
    gitignore: true,
    ignore: ["**/node_modules/**"],
  })

  if (tsconfigFiles.length > 0) {
    result.isTypeScript = true
    result.tsconfigPaths.push(...tsconfigFiles)
  }

  return result
}

export async function getTypeScriptDiagnosticsForConfig(
  typescript: any,
  version: string,
  source: string,
  tsconfigPath: string,
  filePaths?: string[],
): Promise<DiagnosticResult> {
  try {
    // Parse tsconfig and set up VFS
    const configFile = typescript.readConfigFile(tsconfigPath, typescript.sys.readFile)
    if (configFile.error) {
      return {
        success: false,
        language: "typescript",
        version,
        source,
        errorCount: 0,
        diagnostics: [],
        error: `Failed to parse ${path.relative(env.cwd!, tsconfigPath)}: ${typescript.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`,
      }
    }

    const { options, errors } = typescript.parseJsonConfigFileContent(
      configFile.config,
      typescript.sys,
      path.dirname(tsconfigPath), // Use the directory of the tsconfig as the base path
    )

    if (errors && errors.length > 0) {
      return {
        success: false,
        language: "typescript",
        version,
        source,
        errorCount: 0,
        diagnostics: [],
        error: `Failed to parse ${path.relative(env.cwd!, tsconfigPath)} content: ${typescript.flattenDiagnosticMessageText(errors[0].messageText, "\n")}`,
      }
    }

    // Create VFS environment
    const libFiles = createDefaultMapFromNodeModules(options)
    const system = createFSBackedSystem(libFiles, path.dirname(tsconfigPath), typescript)

    // Determine files to check
    const filesToCheck = filePaths || [] // If not provided, will check all files in the project

    // Create virtual TypeScript environment
    const environment = createVirtualTypeScriptEnvironment(
      system,
      filesToCheck,
      typescript,
      options,
    )

    // Get diagnostics
    const program = environment.languageService.getProgram()
    if (!program) {
      return {
        success: false,
        language: "typescript",
        version,
        source,
        errorCount: 0,
        diagnostics: [],
        error: `Failed to create TypeScript program for ${path.relative(env.cwd!, tsconfigPath)}.`,
      }
    }

    // Get diagnostics and filter to only include errors (not warnings or info)
    const allDiagnostics = typescript.getPreEmitDiagnostics(program)
    const errorDiagnostics = allDiagnostics.filter(
      (d: any) => d.category === typescript.DiagnosticCategory.Error,
    )

    // Format diagnostics
    const formattedDiagnostics = errorDiagnostics.map((diagnostic: any) => {
      if (diagnostic.file) {
        const { line, character } = typescript.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start!,
        )
        const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        const relativePath = path.relative(env.cwd!, diagnostic.file.fileName)
        return {
          filePath: relativePath,
          line: line + 1,
          column: character + 1,
          message,
        }
      } else {
        return {
          filePath: "",
          line: 0,
          column: 0,
          message: typescript.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        }
      }
    })

    return {
      success: true,
      language: "typescript",
      version,
      source,
      errorCount: formattedDiagnostics.length,
      diagnostics: formattedDiagnostics,
      configPath: path.relative(env.cwd!, tsconfigPath),
    }
  } catch (error: any) {
    // Check for specific TypeScript configuration errors that should be skipped
    if (handleIncrementalError(error)) {
      // For this specific error, return a more helpful message and skip checking
      return {
        success: false,
        language: "typescript",
        version,
        source,
        errorCount: 0,
        diagnostics: [],
        error: `Configuration issue in ${path.relative(env.cwd!, tsconfigPath)}: The 'incremental' option requires additional configuration. Skipping TypeScript checks.`,
        skipFurtherChecks: true, // Flag to indicate we should skip further checks
      }
    }

    // For other errors, return the standard error format
    return {
      success: false,
      language: "typescript",
      version,
      source,
      errorCount: 0,
      diagnostics: [],
      error: `Error checking ${path.relative(env.cwd!, tsconfigPath)}: ${error.message}`,
    }
  }
}

export async function getTypeScriptDiagnostics(filePaths?: string[]): Promise<DiagnosticResult> {
  // Resolve TypeScript version
  const tsResult = await resolveTypeScript()
  if ("error" in tsResult) {
    return {
      success: false,
      language: "typescript",
      version: "",
      source: "",
      errorCount: 0,
      diagnostics: [],
      error: `Failed to resolve TypeScript: ${tsResult.error.message}`,
    }
  }

  const { typescript, version, source } = tsResult

  // Validate VFS setup
  const vfsValidation = await validateVFS(typescript)
  if (!vfsValidation.success) {
    return {
      success: false,
      language: "typescript",
      version,
      source,
      errorCount: 0,
      diagnostics: [],
      error: `Failed to initialize Virtual File System: ${vfsValidation.error?.message || "Unknown error"}`,
    }
  }

  try {
    // Get all tsconfig paths
    const tsconfigPaths = global.__tsconfigPaths || []

    if (tsconfigPaths.length === 0) {
      return {
        success: false,
        language: "typescript",
        version,
        source,
        errorCount: 0,
        diagnostics: [],
        error:
          "No tsconfig.json files found. Check if TypeScript is installed or if tsconfig.json exists.",
      }
    }

    // Process each tsconfig file
    const results: DiagnosticResult[] = []

    for (const tsconfigPath of tsconfigPaths) {
      const result = await getTypeScriptDiagnosticsForConfig(
        typescript,
        version,
        source,
        tsconfigPath,
        filePaths,
      )

      results.push(result)

      // If this result indicates we should skip further checks, return it immediately
      if (!result.success && result.skipFurtherChecks) {
        return {
          success: false,
          language: "typescript",
          version,
          source,
          errorCount: 0,
          diagnostics: [],
          error: result.error,
          skipFurtherChecks: true,
        }
      }
    }

    // Combine all results
    const allDiagnostics = results.flatMap((r) => r.diagnostics)
    const totalErrorCount = results.reduce((sum, r) => sum + r.errorCount, 0)
    const failedConfigs = results.filter((r) => !r.success)

    if (failedConfigs.length > 0 && failedConfigs[0]) {
      // If any configs failed, return the first error
      return failedConfigs[0]
    }

    return {
      success: true,
      language: "typescript",
      version,
      source,
      errorCount: totalErrorCount,
      diagnostics: allDiagnostics,
      configCount: tsconfigPaths.length,
    }
  } catch (error: any) {
    return {
      success: false,
      language: "typescript",
      version,
      source,
      errorCount: 0,
      diagnostics: [],
      error: error.message,
    }
  }
}
