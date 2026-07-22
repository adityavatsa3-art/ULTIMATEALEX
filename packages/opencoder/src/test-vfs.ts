import {
  createDefaultMapFromNodeModules,
  createFSBackedSystem,
  createSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs"
import ts, {
  JsxEmit,
  ModuleDetectionKind,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  type CompilerOptions,
} from "typescript"
import path from "path"
// const fsMap = new Map<string, string>()
// fsMap.set("index.ts", 'const a = "Hello World"')

// const system = createSystem(fsMap)

const configFile = ts.readConfigFile(path.join(__dirname, "../tsconfig.json"), ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(configFile, ts.sys, process.cwd())
const libFiles = createDefaultMapFromNodeModules(options)
const system = createFSBackedSystem(libFiles, process.cwd(), ts)

const env = createVirtualTypeScriptEnvironment(system, ["src/hello.ts"], ts, options)

// console.log(
//   env.languageService.getDocumentHighlights("src/hello.ts", 0, ["src/hello.ts"])?.[0]
//     ?.highlightSpans,
// )

const program = env.languageService.getProgram()

// console.log(env.languageService.getSemanticDiagnostics("src/hello.ts"))

ts.getPreEmitDiagnostics(program!).forEach((diagnostic) => {
  console.log()
  if (diagnostic.file) {
    const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    return
  }
  console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
})
