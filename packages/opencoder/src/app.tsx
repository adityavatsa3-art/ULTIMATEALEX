import { Box, Text } from "ink"
import React from "react"
import { useAtomValue } from "jotai"
import { Chat } from "./app/chat.js"
import { Spinner } from "@inkjs/ui"
import { ToolConfirmationDialog } from "./components/tool-confirmation-dialog.js"
import { toolConfirmationStateAtom } from "./lib/store/tool-confirmation.js"

// TODO: show alert if user using @next channel
export function App() {
  const toolConfirmation = useAtomValue(toolConfirmationStateAtom)

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" gap={2} display={!toolConfirmation.isOpen ? "flex" : "none"}>
        <Chat />
      </Box>
      <ToolConfirmationDialog />
    </Box>
  )
}
