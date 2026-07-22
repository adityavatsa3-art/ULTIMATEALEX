import React from "react"
import { Text, useInput } from "ink"
import chalk from "chalk"
import { useTextInput } from "../lib/use-text-input.js"
import { getTheme } from "../lib/theme.js"
import { type Key } from "ink"

export type TextInputProps = {
  onHistoryUp?: () => void
  onHistoryDown?: () => void
  placeholder?: string
  multiline?: boolean
  focus?: boolean
  mask?: string
  showCursor?: boolean
  highlightPastedText?: boolean
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  onExit?: () => void
  onExitMessage?: (show: boolean, key?: string) => void
  onMessage?: (show: boolean, message?: string) => void
  onHistoryReset?: () => void
  columns: number
  onPaste?: (text: string) => void
  isDimmed?: boolean
  disableCursorMovementForUpDownKeys?: boolean
  cursorOffset: number
  onChangeCursorOffset: (offset: number) => void
}

export default function TextInput({
  value: originalValue,
  placeholder = "",
  focus = true,
  mask,
  multiline = false,
  highlightPastedText = false,
  showCursor = true,
  onChange,
  onSubmit,
  onExit,
  onHistoryUp,
  onHistoryDown,
  onExitMessage,
  onMessage,
  onHistoryReset,
  columns,
  onPaste,
  isDimmed = false,
  disableCursorMovementForUpDownKeys = false,
  cursorOffset,
  onChangeCursorOffset,
}: TextInputProps): React.ReactNode {
  const { onInput, renderedValue } = useTextInput({
    value: originalValue,
    onChange,
    onSubmit,
    onExit,
    onExitMessage,
    onMessage,
    onHistoryReset,
    onHistoryUp,
    onHistoryDown,
    focus,
    mask,
    multiline,
    cursorChar: showCursor ? " " : "",
    highlightPastedText,
    invert: chalk.inverse,
    themeText: (text: string) => chalk.hex(getTheme().text)(text),
    columns,
    disableCursorMovementForUpDownKeys,
    externalOffset: cursorOffset,
    onOffsetChange: onChangeCursorOffset,
  })

  const [pasteState, setPasteState] = React.useState<{
    chunks: string[]
    timeoutId: ReturnType<typeof setTimeout> | null
  }>({ chunks: [], timeoutId: null })

  const resetPasteTimeout = (currentTimeoutId: ReturnType<typeof setTimeout> | null) => {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
    }
    return setTimeout(() => {
      setPasteState(({ chunks }) => {
        const pastedText = chunks.join("")
        Promise.resolve().then(() => onPaste!(pastedText))
        return { chunks: [], timeoutId: null }
      })
    }, 100)
  }

  const wrappedOnInput = (input: string, key: Key): void => {
    if (onPaste && (input.length > 800 || pasteState.timeoutId)) {
      setPasteState(({ chunks, timeoutId }) => {
        return {
          chunks: [...chunks, input],
          timeoutId: resetPasteTimeout(timeoutId),
        }
      })
      return
    }

    onInput(input, key)
  }

  useInput(wrappedOnInput, { isActive: focus })

  let renderedPlaceholder = placeholder
    ? chalk.hex(getTheme().secondaryText)(placeholder)
    : undefined

  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? chalk.inverse(placeholder[0]) + chalk.hex(getTheme().secondaryText)(placeholder.slice(1))
        : chalk.inverse(" ")
  }

  const showPlaceholder = originalValue.length == 0 && placeholder
  return (
    <Text wrap="truncate-end" dimColor={isDimmed}>
      {showPlaceholder ? renderedPlaceholder : renderedValue}
    </Text>
  )
}
