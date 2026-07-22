import { atom, useAtom, useAtomValue } from "jotai"
import type { ReactNode } from "react"

// Type for the tool confirmation dialog state
export type ToolConfirmationState = {
  isOpen: boolean
  toolName: string
  toolArgs: any
  toolExecution: any
  onConfirm: () => void
  onCancel: () => void
}

// Default state for the tool confirmation dialog
const initialState: ToolConfirmationState = {
  isOpen: false,
  toolName: "",
  toolArgs: {},
  toolExecution: null,
  onConfirm: () => {},
  onCancel: () => {},
}

// Atom for the tool confirmation dialog state
export const toolConfirmationStateAtom = atom<ToolConfirmationState>(initialState)

// Atom for the list of tools that should be auto-accepted
export const autoAcceptToolsAtom = atom<string[] | true>([])

// Hook for using the tool confirmation dialog
export function useToolConfirmation() {
  const [state, setState] = useAtom(toolConfirmationStateAtom)
  
  // Function to show the tool confirmation dialog
  const showToolConfirmation = (
    toolName: string,
    toolArgs: any,
    toolExecution: any,
    onConfirm: () => void,
    onCancel: () => void
  ) => {
    setState({
      isOpen: true,
      toolName,
      toolArgs,
      toolExecution,
      onConfirm,
      onCancel,
    })
  }
  
  // Function to close the tool confirmation dialog
  const closeToolConfirmation = () => {
    console.clear()
    setState(initialState)
  }
  
  return {
    state,
    showToolConfirmation,
    closeToolConfirmation,
  }
}

// Hook to check if a tool should be auto-accepted
export function useAutoAcceptTool() {
  const autoAcceptTools = useAtomValue(autoAcceptToolsAtom)
  
  const shouldAutoAccept = (toolName: string) => {
    if (autoAcceptTools === true) {
      return true
    }
    
    return autoAcceptTools.includes(toolName)
  }
  
  return { shouldAutoAccept }
}
