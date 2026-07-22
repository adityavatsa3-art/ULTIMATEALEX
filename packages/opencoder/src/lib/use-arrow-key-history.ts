import { messageStorage } from "@/lib/storage.js"
import { useState } from "react"

let history = [] as string[]
messageStorage.get("/history").then((v) => {
  history = v as string[]
})

let timeout: NodeJS.Timeout

export function useArrowKeyHistory(
  onSetInput: (value: string, mode: "bash" | "prompt") => void,
  currentInput: string,
) {
  const [historyIndex, setHistoryIndex] = useState(0)
  const [lastTypedInput, setLastTypedInput] = useState("")

  const updateInput = (input: string | undefined) => {
    if (input !== undefined) {
      const mode = "prompt"
      const value = input
      onSetInput(value, mode)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        messageStorage.get("/history").then((v) => {
          history = v as string[]
        })
      }, 0)
    }
  }

  function onHistoryUp() {
    const latestHistory = history
    if (historyIndex < latestHistory.length) {
      if (historyIndex === 0 && currentInput.trim() !== "") {
        setLastTypedInput(currentInput)
      }
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      updateInput(latestHistory[historyIndex])
    }
  }

  function onHistoryDown() {
    const latestHistory = history
    if (historyIndex > 1) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      updateInput(latestHistory[newIndex - 1])
    } else if (historyIndex === 1) {
      setHistoryIndex(0)
      updateInput(lastTypedInput)
    }
  }

  function resetHistory() {
    setLastTypedInput("")
    setHistoryIndex(0)
  }

  return {
    historyIndex,
    setHistoryIndex,
    onHistoryUp,
    onHistoryDown,
    resetHistory,
  }
}
