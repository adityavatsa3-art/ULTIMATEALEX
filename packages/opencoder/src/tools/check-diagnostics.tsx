import { Box, Text } from "ink"
import React from "react"
import { env } from "@/lib/env.js"
import { defineTool } from "@/tools/ai.js"
import { DefaultRejectedMessage } from "@/tools/shared/fallback-rejected-message.js"
import { z } from "zod"
import { isTypeScriptProject, getTypeScriptDiagnostics } from "@/lib/typescript.js"
import { config } from "@/lib/config.js"

export const registerDiagnosticsTool = async () => {
  if (config.experimental?.diagnosticsTool === false) {
    return null
  }

  const { isTypeScript, tsconfigPaths } = await isTypeScriptProject()

  if (!isTypeScript) {
    return null
  }

  global.__tsconfigPaths = tsconfigPaths

  return defineTool({
    description: `The check-diagnostics tool runs TypeScript diagnostics on your project or specific files to identify type errors and other issues.

Use this tool when:
1. You've made changes to TypeScript files and want to check for type errors
2. You want to validate the TypeScript configuration of your project
3. You need to identify and fix TypeScript errors in specific files

The tool will:
1. Detect and use your project's TypeScript version
2. Analyze TypeScript files based on your project's tsconfig.json
3. Return a list of errors, warnings, and suggestions

Example usage:
<function_calls>
<invoke name="check-diagnostics">
<parameter name="filePaths">["src/components/example.tsx", "src/utils/helpers.ts"]</parameter>
</invoke>

</function_calls>

Or to check all TypeScript files in the project:
<function_calls>
<invoke name="check-diagnostics">
</invoke>
</function_calls>`,
    parameters: z.strictObject({
      filePaths: z
        .array(z.string())
        .optional()
        .describe(
          "Optional array of file paths to check. If not provided, all TypeScript files in the project will be checked.",
        ),
    }),
    async *generate({ filePaths }) {
      yield "Checking TypeScript diagnostics..."

      yield (
        <div>
          <span>Checking TypeScript diagnostics...</span>
        </div>
      )

      const result = await getTypeScriptDiagnostics(filePaths)

      if (!result.success) {
        let errorMessage = ""

        if (result.error?.includes("No tsconfig.json files found")) {
          errorMessage = `Error: The project doesn't appear to be TypeScript-based.\nCheck if TypeScript is installed or if tsconfig.json exists.`
        } else if (result.error?.includes("Failed to resolve TypeScript")) {
          errorMessage = `Error: Failed to resolve TypeScript.\nAttempted paths: ${env.cwd}/node_modules/typescript, bundled typescript`
        } else if (result.error?.includes("Failed to initialize Virtual File System")) {
          errorMessage = `Error: Failed to initialize Virtual File System.\nDetails: ${result.error.replace("Failed to initialize Virtual File System: ", "")}`
        } else if (result.error?.includes("Failed to parse")) {
          errorMessage = `Error: Failed to parse tsconfig.json.\nDetails: ${result.error.replace("Failed to parse ", "")}`
        } else if (result.error?.includes("Configuration issue") && result.skipFurtherChecks) {
          errorMessage = `${result.error}\n\nThis is a common configuration issue that doesn't affect your code quality.\nTo fix it, either:\n1. Remove the 'incremental' option from tsconfig.json, or\n2. Add a 'tsBuildInfoFile' option to specify where to store incremental compilation information.`
        } else {
          errorMessage = `Error: ${result.error}`
        }

        yield errorMessage

        yield (
          <Box flexDirection="column">
            <Text bold color="red">
              TypeScript Diagnostics Error
            </Text>
            <Text>{errorMessage}</Text>
          </Box>
        )

        return
      }

      let output = `TypeScript version: ${result.version} (${result.source})\n\n`

      if (result.configCount && result.configCount > 1) {
        output += `Monorepo detected with ${result.configCount} TypeScript configurations\n\n`
      }

      output += `Diagnostic Summary:\n`
      output += `- Errors: ${result.errorCount}\n\n`

      if (result.errorCount > 0) {
        output += `Diagnostics:\n`
        result.diagnostics.forEach((diagnostic, index) => {
          output += `${index + 1}. ${diagnostic.filePath} (${diagnostic.line},${diagnostic.column}): ${diagnostic.message}\n`
        })
      } else {
        output += `No TypeScript errors found.`
      }

      yield (
        <Box flexDirection="column">
          <Text bold>TypeScript Diagnostics Summary</Text>
          <Box marginTop={1}>
            <Text>Errors: {result.errorCount}</Text>
          </Box>
          {result.errorCount > 0 ? (
            <Box marginTop={1} flexDirection="column">
              {result.diagnostics.map((diagnostic, index) => (
                <Text key={index}>
                  {diagnostic.filePath} ({diagnostic.line},{diagnostic.column}):{" "}
                  {diagnostic.message.split(".")[0]}
                </Text>
              ))}
            </Box>
          ) : (
            <Box marginTop={1}>
              <Text color="green">No TypeScript errors found.</Text>
            </Box>
          )}
        </Box>
      )

      yield output
    },
    renderTitle: () => <Text>TypeScript Diagnostics</Text>,
  })
}

export const tool = await registerDiagnosticsTool()

export function render() {
  return <Text>TypeScript Diagnostics</Text>
}

export const renderRejectedMessage = DefaultRejectedMessage
