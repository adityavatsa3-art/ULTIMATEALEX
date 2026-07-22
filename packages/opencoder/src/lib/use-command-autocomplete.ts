import { useInput } from "ink"
import { useState, useCallback } from "react"

type Command = any

const getCommand = (suggestion: string, commands: Command[]) => {
  return commands.find((cmd) => cmd.userFacingName() === suggestion)
}

type Props = {
  commands: Command[]
  onInputChange: (value: string) => void
  onSubmit: (value: string, isSubmittingSlashCommand?: boolean) => void
  setCursorOffset: (offset: number) => void
}

export function useCommandAutocomplete({
  commands,
  onInputChange,
  onSubmit,
  setCursorOffset,
}: Props): {
  suggestions: string[]
  selectedSuggestion: number
  updateSuggestions: (value: string) => void
  clearSuggestions: () => void
} {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)

  function updateSuggestions(value: string) {
    if (value.startsWith("/")) {
      const query = value.slice(1).toLowerCase()

      // Find commands whose name or alias matches the query
      const matchingCommands = commands
        .filter((cmd) => !cmd.isHidden)
        .filter((cmd) => {
          const names = [cmd.userFacingName()]
          if (cmd.aliases) {
            names.push(...cmd.aliases)
          }
          return names.some((name) => name.toLowerCase().startsWith(query))
        })

      // For each matching command, include its primary name
      const filtered = matchingCommands.map((cmd) => cmd.userFacingName())
      setSuggestions(filtered)

      // Try to preserve the selected suggestion
      const newIndex =
        selectedSuggestion > -1 ? filtered.indexOf(suggestions[selectedSuggestion]!) : 0
      if (newIndex > -1) {
        setSelectedSuggestion(newIndex)
      } else {
        setSelectedSuggestion(0)
      }
    } else {
      setSuggestions([])
      setSelectedSuggestion(-1)
    }
  }

  useInput((_, key) => {
    if (suggestions.length > 0) {
      if (key.downArrow) {
        setSelectedSuggestion((prev) => (prev >= suggestions.length - 1 ? 0 : prev + 1))
        return true
      } else if (key.upArrow) {
        setSelectedSuggestion((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1))
        return true
      } else if (key.tab || (key.return && selectedSuggestion >= 0)) {
        if (selectedSuggestion === -1 && key.tab) {
          setSelectedSuggestion(0)
        }

        const suggestionIndex = selectedSuggestion >= 0 ? selectedSuggestion : 0
        const suggestion = suggestions[suggestionIndex]
        if (!suggestion) return true

        const input = "/" + suggestion + " "
        onInputChange(input)
        setCursorOffset(input.length)
        setSuggestions([])
        setSelectedSuggestion(-1)

        if (key.return) {
          const command = getCommand(suggestion, commands)
          if (command.type !== "prompt" || (command.argNames ?? []).length === 0) {
            onSubmit(input, true)
          }
        }

        return true
      }
    }
  })

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setSelectedSuggestion(-1)
  }, [])

  return {
    suggestions,
    selectedSuggestion,
    updateSuggestions,
    clearSuggestions,
  }
}
