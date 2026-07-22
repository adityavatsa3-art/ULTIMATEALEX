import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Box, Text } from "ink"
import React, { use, useEffect } from "react"
import { exec } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { env } from "@/lib/env.js"
import { getTheme } from "@/lib/theme.js"
import { build$, CommandBuilder, RequestBuilder } from "dax-sh"
import { detect, getUserAgent } from "package-manager-detector/detect"
import { gt, gte, lt } from "semver"

export function CodebaseIndex() {
  const sync = useMutation({
    mutationFn: async () => {},
  })

  const theme = getTheme()

  return (
    <Box flexDirection="row" paddingX={2} paddingY={0}>
      Indexing codebase...
    </Box>
  )
}
