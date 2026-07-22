import type { ToolExecutionOptions } from "ai"
import { useToolConfirmation } from "./store/tool-confirmation.js"
import { useAutoAcceptTool } from "./store/tool-confirmation.js"
import { useAppContext } from "../app/context.js"
import { useAtom } from "jotai"
import { autoAcceptToolsAtom } from "./store/tool-confirmation.js"

// Create a promise that can be resolved externally
export function createResolvablePromise<T>() {
  let resolve: (value: T) => void
  let reject: (reason?: any) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve: resolve!, reject: reject! }
}

// Wrapper function to show confirmation dialog before executing a tool
export function useToolConfirmationWrapper() {
  const { showToolConfirmation, closeToolConfirmation } = useToolConfirmation()
  const { shouldAutoAccept } = useAutoAcceptTool()
  const { toolConfirmation } = useAppContext()

  // Initialize auto-accept tools from config
  const [autoAcceptTools, setAutoAcceptTools] = useAtom(autoAcceptToolsAtom)

  // Set auto-accept tools from config if not already set
  if (autoAcceptTools !== true && Array.isArray(autoAcceptTools) && autoAcceptTools.length === 0) {
    // Handle autoAcceptTools from config
    if (toolConfirmation?.autoAcceptTools === true) {
      setAutoAcceptTools(true)
    } else if (Array.isArray(toolConfirmation?.autoAcceptTools) && toolConfirmation.autoAcceptTools.length > 0) {
      setAutoAcceptTools(toolConfirmation.autoAcceptTools)
    }

    // Handle autoAcceptBashCommands from config
    if (Array.isArray(toolConfirmation?.autoAcceptBashCommands) && toolConfirmation.autoAcceptBashCommands.length > 0) {
      // Convert bash commands to the format "bash:command"
      const bashCommands = toolConfirmation.autoAcceptBashCommands.map(cmd => `bash:${cmd}`)

      // Add to existing auto-accept tools if it's an array
      if (Array.isArray(autoAcceptTools)) {
        setAutoAcceptTools([...autoAcceptTools, ...bashCommands])
      }
    }
  }

  // Wrap a tool execution function with confirmation dialog
  const wrapToolExecution = <T extends (...args: any[]) => Promise<any>>(
    toolName: string,
    toolArgs: any,
    toolExecution: ToolExecutionOptions,
    executeFn: T,
  ): Promise<ReturnType<T>> => {
    if (import.meta.env.MODE === "test") {
      // Bypass tool confirmation in test mode
      return executeFn()
    }

    if (toolName !== "bash") {
      // only show confirmation for bash tool
      return executeFn()
    }

    if (toolName === "bash" && typeof toolArgs.command === "string") {
      // Special handling for bash tool
      // Check if the bash command should be auto-accepted
      if (shouldAutoAccept(`bash:${toolArgs.command}`)) {
        return executeFn()
      }
    }

    // Create a promise that will be resolved when the user confirms or cancels
    const { promise, resolve, reject } = createResolvablePromise<ReturnType<T>>()

    // Show the confirmation dialog
    console.clear()
    showToolConfirmation(
      toolName,
      toolArgs,
      toolExecution,
      // On confirm
      () => {
        closeToolConfirmation()
        // Execute the tool and resolve the promise with the result
        executeFn()
          .then(resolve)
          .catch(reject)
          .finally(() => closeToolConfirmation())
      },
      // On cancel
      () => {
        closeToolConfirmation()
        // Resolve with a cancellation message instead of rejecting with an error
        resolve(
          `The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.` as any,
        )
      },
    )

    return promise
  }

  return { wrapToolExecution }
}
