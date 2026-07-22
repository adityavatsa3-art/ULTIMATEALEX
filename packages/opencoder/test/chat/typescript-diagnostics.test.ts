import { vi, test, expect, beforeEach, afterEach, afterAll, beforeAll } from "vitest"
import path from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import os from "node:os"
import { MockLanguageModelV1 } from "ai/test"
import { convertArrayToReadableStream } from "ai/test"
import { env } from "../../src/lib/env.js"
import { waitNextRender } from "../utils/render.js"
import { setupTestEnvironment } from "./util.js"
import { setTimeout } from "node:timers/promises"
// Import once at the top level to ensure consistent module loading
import { registerDiagnosticsTool } from "../../src/tools/check-diagnostics.js"

// We'll use env.cwd to set the current working directory for each test

// Create a temporary directory for our test projects
const testDir = path.join(os.tmpdir(), `typescript-diagnostics-test-${Date.now()}`)

// Define test project structures
const testProjects = {
  simple: {
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "es2020",
        module: "esnext",
        moduleResolution: "node",
        strict: true,
      },
      include: ["src/**/*.ts"],
    }),
    "src/index.ts": "console.log('Hello, world!');",
  },
  withErrors: {
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "es2020",
        module: "esnext",
        moduleResolution: "node",
        strict: true,
      },
      include: ["src/**/*.ts"],
    }),
    "src/index.ts": "const x: number = 'string'; // Type error",
  },
  withConfigError: {
    "tsconfig.json": "{ invalid json }",
  },
  withIncrementalError: {
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "es2020",
        module: "esnext",
        moduleResolution: "node",
        strict: true,
        incremental: true,
      },
      include: ["src/**/*.ts"],
    }),
    "src/index.ts": "console.log('Hello, world!');",
  },
}

// Helper to create a test project on disk
const createTestProject = (projectType: string) => {
  const projectDir = path.join(testDir, projectType)

  try {
    // Create project directory
    mkdirSync(projectDir, { recursive: true })

    // Create project files
    const projectFiles = testProjects[projectType as keyof typeof testProjects]

    for (const [filePath, content] of Object.entries(projectFiles)) {
      const fullPath = path.join(projectDir, filePath)

      // Create directory if needed
      if (filePath.includes("/")) {
        const dirPath = path.dirname(fullPath)
        mkdirSync(dirPath, { recursive: true })
      }

      // Write file content
      writeFileSync(fullPath, content)
    }

    return projectDir
  } catch (error) {
    console.error(`Error creating test project: ${error}`)
    throw error
  }
}

// Initialize TypeScript before any tests run
beforeAll(async () => {
  // Ensure the test directory exists
  try {
    mkdirSync(testDir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }

  // Pre-initialize TypeScript to avoid race conditions
  const simpleProjectDir = createTestProject("simple")
  env.cwd = simpleProjectDir

  // Register the tool once to ensure TypeScript is loaded
  await registerDiagnosticsTool()

  // Wait a bit to ensure TypeScript is fully loaded
  await setTimeout(500)
})

beforeEach(() => {
  vi.resetModules()
  global.__tsconfigPaths = undefined

  // Create test directory
  try {
    mkdirSync(testDir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
})

afterEach(() => {
  // env.cwd = originalCwd
  // global.__tsconfigPaths = undefined
  vi.clearAllMocks()
})

afterAll(() => {
  // Clean up test directory
  try {
    rmSync(testDir, { recursive: true, force: true })
  } catch (error) {
    console.error(`Error cleaning up test directory: ${error}`)
  }
})

test("check-diagnostics tool handles simple project with no errors", async () => {
  // Add a small delay to ensure TypeScript is fully loaded
  await setTimeout(100)
  // Set up environment for a simple project
  const projectDir = createTestProject("simple")
  env.cwd = projectDir

  // Create a mock model for testing
  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  // Set up the test environment
  const { instance, stdin, stdout } = await setupTestEnvironment({
    model: mockModel,
    customTools: {
      "check-diagnostics": await registerDiagnosticsTool(),
    },
  })

  // Verify the tool is registered
  expect(global.__tsconfigPaths).toBeDefined()

  // Simulate user input to trigger the tool
  assert(stdin)
  stdin.emit("input", "Check my TypeScript code")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()

  // Mock AI response to call the tool
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "tool-call",
        toolCallId: "tool_diagnostics_1",
        toolName: "check-diagnostics",
        args: JSON.stringify({}),
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 10, completionTokens: 5 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Mock AI response after tool execution
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      { type: "text-delta", textDelta: "Your TypeScript code looks good! No errors found." },
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 20, completionTokens: 10 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Wait for the tool to execute and verify output
  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain("Custom tool: check-diagnostics")
      expect(output).toContain("Your TypeScript code looks good! No errors found.")
    },
    { timeout: 5000, interval: 100 },
  )

  // Verify final state
  expect(doStreamMock).toHaveBeenCalledTimes(2)

  instance.unmount()
})

test("'check-diagnostics' tool handles project with errors", async () => {
  // Add a small delay to ensure TypeScript is fully loaded
  await setTimeout(100)
  // Set up environment for a project with errors
  const projectDir = createTestProject("withErrors")
  env.cwd = projectDir

  // Use the already imported tool module

  // Create a mock model for testing
  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  // Set up the test environment
  const { instance, stdin, stdout } = await setupTestEnvironment({
    model: mockModel,
    customTools: {
      "check-diagnostics": await registerDiagnosticsTool(),
    },
  })

  // Verify the tool is registered
  expect(global.__tsconfigPaths).toBeDefined()

  // Simulate user input to trigger the tool
  assert(stdin)
  stdin.emit("input", "Check my TypeScript code")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()

  // Mock AI response to call the tool
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "tool-call",
        toolCallId: "tool_diagnostics_1",
        toolName: "check-diagnostics",
        args: JSON.stringify({}),
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 10, completionTokens: 5 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Mock AI response after tool execution
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      { type: "text-delta", textDelta: "I found some TypeScript errors in your code." },
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 20, completionTokens: 10 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Wait for the tool to execute and verify output
  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain("Custom tool: check-diagnostics")
      expect(output).toContain("I found some TypeScript errors in your code.")
    },
    { timeout: 5000, interval: 100 },
  )

  // Verify final state
  expect(doStreamMock).toHaveBeenCalledTimes(2)

  instance.unmount()
})

test("'check-diagnostics' tool handles project with config error", async () => {
  // Add a small delay to ensure TypeScript is fully loaded
  await setTimeout(100)
  // Set up environment for a project with config error
  const projectDir = createTestProject("withConfigError")
  env.cwd = projectDir

  // Use the already imported tool module

  // Create a mock model for testing
  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  // Set up the test environment
  const { instance, stdin, stdout } = await setupTestEnvironment({
    model: mockModel,
    customTools: {
      "check-diagnostics": await registerDiagnosticsTool(),
    },
  })

  // Verify the tool is registered
  expect(global.__tsconfigPaths).toBeDefined()

  // Simulate user input to trigger the tool
  assert(stdin)
  stdin.emit("input", "Check my TypeScript code")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()

  // Mock AI response to call the tool
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "tool-call",
        toolCallId: "tool_diagnostics_1",
        toolName: "check-diagnostics",
        args: JSON.stringify({}),
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 10, completionTokens: 5 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Mock AI response after tool execution
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "text-delta",
        textDelta: "There seems to be an issue with your TypeScript configuration.",
      },
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 20, completionTokens: 10 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Wait for the tool to execute and verify output
  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain("Custom tool: check-diagnostics")
      expect(output).toContain("There seems to be an issue with your TypeScript configuration.")
    },
    { timeout: 5000, interval: 100 },
  )

  // Verify final state
  expect(doStreamMock).toHaveBeenCalledTimes(2)

  instance.unmount()
})

test("'check-diagnostics' tool handles project with incremental error", async () => {
  // Add a small delay to ensure TypeScript is fully loaded
  await setTimeout(100)
  // Set up environment for a project with incremental error
  const projectDir = createTestProject("withIncrementalError")
  env.cwd = projectDir

  // Use the already imported tool module

  // Create a mock model for testing
  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  // Set up the test environment
  const { instance, stdin, stdout } = await setupTestEnvironment({
    model: mockModel,
    customTools: {
      "check-diagnostics": await registerDiagnosticsTool(),
    },
  })

  // Verify the tool is registered
  expect(global.__tsconfigPaths).toBeDefined()

  // Simulate user input to trigger the tool
  assert(stdin)
  stdin.emit("input", "Check my TypeScript code")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()

  // Mock AI response to call the tool
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "tool-call",
        toolCallId: "tool_diagnostics_1",
        toolName: "check-diagnostics",
        args: JSON.stringify({}),
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 10, completionTokens: 5 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Mock AI response after tool execution
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "text-delta",
        textDelta:
          "There is a configuration issue with the incremental option in your tsconfig.json.",
      },
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 20, completionTokens: 10 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Wait for the tool to execute and verify output
  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain("Custom tool: check-diagnostics")
      expect(output).toContain(
        "There is a configuration issue with the incremental option in your tsconfig.json.",
      )
    },
    { timeout: 5000, interval: 100 },
  )

  // Verify final state
  expect(doStreamMock).toHaveBeenCalledTimes(2)

  instance.unmount()
})

test("'check-diagnostics' tool handles specific file paths", async () => {
  // Add a small delay to ensure TypeScript is fully loaded
  await setTimeout(100)
  // Set up environment for a project with errors
  const projectDir = createTestProject("withErrors")
  env.cwd = projectDir

  // Use the already imported tool module

  // Create a mock model for testing
  const mockModel = new MockLanguageModelV1({})
  const doStreamMock = vi.fn()
  mockModel.doStream = doStreamMock

  // Set up the test environment
  const { instance, stdin, stdout } = await setupTestEnvironment({
    model: mockModel,
    customTools: {
      "check-diagnostics": await registerDiagnosticsTool(),
    },
  })

  // Verify the tool is registered
  expect(global.__tsconfigPaths).toBeDefined()

  // Simulate user input to trigger the tool
  assert(stdin)
  stdin.emit("input", "Check my TypeScript code")
  await waitNextRender()
  stdin.emit("input", "\r")
  await waitNextRender()

  // Mock AI response to call the tool with specific file paths
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "tool-call",
        toolCallId: "tool_diagnostics_1",
        toolName: "check-diagnostics",
        args: JSON.stringify({ filePaths: ["src/index.ts"] }),
      },
      {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 10, completionTokens: 5 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Mock AI response after tool execution
  doStreamMock.mockImplementationOnce(async () => ({
    stream: convertArrayToReadableStream([
      {
        type: "text-delta",
        textDelta: "I found some TypeScript errors in the specific file you asked me to check.",
      },
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 20, completionTokens: 10 },
      },
    ]),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }))

  // Wait for the tool to execute and verify output
  await vi.waitFor(
    () => {
      const output = stdout.get()
      expect(output).toContain("Custom tool: check-diagnostics")
      expect(output).toContain(
        "I found some TypeScript errors in the specific file you asked me to check.",
      )
    },
    { timeout: 5000, interval: 100 },
  )

  // Verify final state
  expect(doStreamMock).toHaveBeenCalledTimes(2)

  instance.unmount()
})
