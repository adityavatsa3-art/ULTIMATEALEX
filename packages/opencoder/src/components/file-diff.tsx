import type { Hunk } from "diff"
import { Box, Text } from "ink"
import * as React from "react"
import { relative } from "path"
import { getTheme } from "../lib/theme.js"
import { useTerminalSize } from "@/lib/use-terminal-size.js"
import { env } from "@/lib/env.js"
import { StructuredDiff } from "@/components/diff.js"

function intersperse<A>(as: A[], separator: (index: number) => A): A[] {
  return as.flatMap((a, i) => (i ? [separator(i), a] : [a]))
}

type Props = {
  filePath: string
  structuredPatch: Hunk[]
  verbose: boolean
}

export function FileContentDiff({ filePath, structuredPatch, verbose }: Props): React.ReactNode {
  const { columns } = useTerminalSize()
  const numAdditions = structuredPatch.reduce(
    (count, hunk) => count + hunk.lines.filter((_) => _.startsWith("+")).length,
    0,
  )
  const numRemovals = structuredPatch.reduce(
    (count, hunk) => count + hunk.lines.filter((_) => _.startsWith("-")).length,
    0,
  )

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        <Text bold>{verbose ? filePath : relative(env.cwd, filePath)}</Text>
        {numAdditions > 0 || numRemovals > 0 ? " with " : ""}
        {numAdditions > 0 ? (
          <>
            <Text bold>{numAdditions}</Text> {numAdditions > 1 ? "additions" : "addition"}
          </>
        ) : null}
        {numAdditions > 0 && numRemovals > 0 ? " and " : null}
        {numRemovals > 0 ? (
          <>
            <Text bold>{numRemovals}</Text> {numRemovals > 1 ? "removals" : "removal"}
          </>
        ) : null}
      </Text>
      {intersperse(
        structuredPatch.map((_) => (
          <Box flexDirection="column" key={_.newStart}>
            <StructuredDiff patch={_} dim={false} width={columns - 12} />
          </Box>
        )),
        (i) => (
          <Box key={`ellipsis-${i}`}>
            <Text color={getTheme().secondaryText}>...</Text>
          </Box>
        ),
      )}
    </Box>
  )
}
