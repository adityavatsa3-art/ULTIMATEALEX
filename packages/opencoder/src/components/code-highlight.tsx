import { highlight, supportsLanguage } from "cli-highlight"
import { Text } from "ink"
import React, { useMemo } from "react"
import { logError } from "../lib/logger.js"

type Props = {
  code: string
  language: string
}

export function CodeHighlight({ code, language }: Props): React.ReactElement {
  const highlightedCode = useMemo(() => {
    try {
      return highlight(code, { language })
      if (supportsLanguage(language)) {
      } else {
        logError(
          `Language not supported while highlighting code, falling back to markdown: ${language}`,
        )
        return highlight(code, { language: "markdown" })
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Unknown language")) {
        logError(`Language not supported while highlighting code, falling back to markdown: ${e}`)
        return highlight(code, { language: "markdown" })
      }
    }
  }, [code, language])

  return <Text>{highlightedCode}</Text>
}
