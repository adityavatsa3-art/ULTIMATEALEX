import type ParserType from "@vscode/tree-sitter-wasm"
import type { Point, Edit } from "@vscode/tree-sitter-wasm"
import ParserJS from "./bundled/treesitter.js"
// @ts-ignore
import wasm from "@vscode/tree-sitter-wasm/wasm/tree-sitter-typescript.wasm"
import path from "path"

const treeSitter = ParserJS as unknown as typeof ParserType

// --- Helper Function ---
function formatNodeLocation(node: ParserType.Node): string {
  return `[${node.startPosition.row}:${node.startPosition.column} - ${node.endPosition.row}:${node.endPosition.column}]`
}

// Helper to convert offset to Point (simple version, assumes LF endings)
function offsetToPoint(text: string, offset: number): Point {
  const lines = text.substring(0, offset).split("\n")
  const row = lines.length - 1
  const column = (lines[row] ?? "").length
  return { row, column }
}

// Helper to traverse and find errors
function checkTreeForErrors(node: ParserType.Node): boolean {
  if (node.isError || node.isMissing) {
    console.warn(
      `Found Error/Missing Node: ${node.type} ${formatNodeLocation(node)} Text: "${node.text}"`,
    )
    return true
  }
  let hasError = false
  for (const child of node.children) {
    if (child && checkTreeForErrors(child)) {
      hasError = true // Found an error in subtree
    }
  }
  return hasError
}

// --- Main Logic ---
async function analyzeFile(filePath: string) {
  console.log(`Analyzing: ${filePath}\n`)

  await treeSitter.Parser.init()
  const parser = new treeSitter.Parser()
  let initialTree: ParserType.Tree | null = null
  let editedTree: ParserType.Tree | null = null

  try {
    // --- Initial Parse ---
    console.log("--- Initial Parse ---")
    const language = await treeSitter.Language.load(
      new Uint8Array(await Bun.file(wasm).arrayBuffer()),
    )
    parser.setLanguage(language)

    const initialSourceCode = await Bun.file(filePath).text()
    initialTree = parser.parse(initialSourceCode)

    if (!initialTree) {
      console.error("Initial parse failed.")
      return
    }
    console.log("Initial parse successful.")
    console.log("---------------------\n")

    // --- Simulate an Edit ---
    // Let's add a console.log statement at the end of the file
    const editStartPosition = initialSourceCode.length
    const textToAdd = "\nconsole.log('Incremental parse test!');"
    const newSourceCode = initialSourceCode + textToAdd
    const editEndPosition = newSourceCode.length

    const startPoint = offsetToPoint(initialSourceCode, editStartPosition)
    const oldEndPoint = startPoint
    const newEndPoint = offsetToPoint(newSourceCode, editEndPosition)

    const edit: Edit = {
      startIndex: editStartPosition,
      oldEndIndex: editStartPosition, // No text deleted
      newEndIndex: editEndPosition,
      startPosition: startPoint,
      oldEndPosition: oldEndPoint,
      newEndPosition: newEndPoint,
    }

    console.log("--- Simulating Edit ---")
    console.log(`Adding text: "${textToAdd.trim()}"`)
    console.log(`Edit details:`, edit)

    // Apply the edit to the initial tree (IMPORTANT for incremental parsing)
    initialTree.edit(edit)
    console.log("Applied edit to the initial tree object.")
    console.log("-----------------------\n")

    // --- Incremental Parse ---
    console.log("--- Incremental Parse ---")
    const startTime = performance.now()
    editedTree = parser.parse(newSourceCode, initialTree) // Pass the *edited* old tree
    const endTime = performance.now()

    if (!editedTree) {
      console.error("Incremental parse failed.")
      return
    }
    console.log(`Incremental parse successful in ${(endTime - startTime).toFixed(2)} ms.`)
    console.log("------------------------\n")

    // --- Analyze the *Edited* Tree ---
    console.log("--- Analysis of *Edited* Tree ---")

    // Check for Errors
    console.log("Checking for parse errors in the edited tree...")
    const hasErrors = checkTreeForErrors(editedTree.rootNode)
    if (!hasErrors) {
      console.log("No errors found in the edited tree.")
    }
    console.log("---------------------------------")

    // Regenerate Repo Map Summary (should reflect the change)
    const functionsQuery = new treeSitter.Query(
      language,
      `
      [
        (function_declaration name: (identifier) @function.name)
        (export_statement declaration: (function_declaration name: (identifier) @function.export.name))
        (method_definition name: (property_identifier) @method.name)
      ]
      `,
    )

    const classesQuery = new treeSitter.Query(
      language,
      `
      [
        (class_declaration name: (type_identifier) @class.name)
        (export_statement declaration: (class_declaration name: (type_identifier) @class.export.name))
      ]
      `,
    )

    const importsQuery = new treeSitter.Query(
      language,
      `
      [
        (import_statement source: (string) @import.source
          (import_clause (named_imports (import_specifier name: (identifier) @import.name)))?
          (import_clause (namespace_import (identifier) @import.namespace))?
          (import_clause (identifier) @import.default)?
         )
      ]
      `,
    )

    const functionMatches = functionsQuery.matches(editedTree.rootNode)
    const classMatches = classesQuery.matches(editedTree.rootNode)
    const importMatches = importsQuery.matches(editedTree.rootNode)

    console.log("\n--- Repo Map Summary (Post-Edit) ---")
    console.log(`File: ${path.basename(filePath)}`)

    // Imports
    if (importMatches.length > 0) {
      console.log("  Imports:")
      const importsMap = new Map<string, string[]>()
      for (const match of importMatches) {
        const sourceCapture = match.captures.find((c) => c.name === "import.source")
        const nameCapture = match.captures.find((c) => c.name === "import.name")
        const namespaceCapture = match.captures.find((c) => c.name === "import.namespace")
        const defaultCapture = match.captures.find((c) => c.name === "import.default")

        if (sourceCapture) {
          const source = sourceCapture.node.text.slice(1, -1)
          let specifier = ""
          if (nameCapture) specifier = nameCapture.node.text
          if (namespaceCapture) specifier = `* as ${namespaceCapture.node.text}`
          if (defaultCapture) specifier = defaultCapture.node.text

          if (!importsMap.has(source)) importsMap.set(source, [])
          if (specifier) importsMap.get(source)?.push(specifier)
        }
      }
      for (const [source, names] of importsMap.entries()) {
        console.log(`    from "${source}"${names.length > 0 ? `: { ${names.join(", ")} }` : ""}`)
      }
    }

    // Classes
    if (classMatches.length > 0) {
      console.log("  Classes:")
      for (const match of classMatches) {
        const nameCapture = match.captures.find((c) => c.name.startsWith("class."))
        if (nameCapture) {
          console.log(
            `    ${nameCapture.name.includes("export") ? "export " : ""}class ${nameCapture.node.text}`,
          )
        }
      }
    }

    // Functions / Methods
    if (functionMatches.length > 0) {
      console.log("  Functions/Methods:")
      for (const match of functionMatches) {
        const nameCapture = match.captures.find(
          (c) => c.name.startsWith("function.") || c.name.startsWith("method."),
        )
        if (nameCapture) {
          const type = nameCapture.name.split(".")[0]
          const isExport = nameCapture.name.includes("export")
          const signature = `${nameCapture.node.text}()`
          console.log(`    ${isExport ? "export " : ""}${type} ${signature}`)
          // Check if it's our new function
          if (nameCapture.node.text === "log" && match.patternIndex === 0) {
            // Simplistic check for console.log
          }
        }
      }
    }
    console.log("-----------------------------------\n")
  } catch (error) {
    console.error("An error occurred:", error)
  } finally {
    // Clean up trees and parser
    initialTree?.delete()
    editedTree?.delete()
    parser.delete()
  }
}

// --- Run Analysis ---
// Use path.join for better cross-platform compatibility
const targetFilePath = path.join(__dirname, "./index.ts")
analyzeFile(targetFilePath)
