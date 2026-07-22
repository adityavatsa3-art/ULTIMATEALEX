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
import pkg from "../../package.json" with { type: "json" }

const currentVersion = pkg.version
let cwdVersion: string | undefined
try {
  const pkg = JSON.parse(readFileSync(join(env.cwd, "package.json"), "utf-8"))
  cwdVersion =
    pkg.dependencies.opencoder ||
    pkg.devDependencies.opencoder ||
    pkg.optionalDependencies.opencoder
  if (cwdVersion?.startsWith("^")) {
    cwdVersion = cwdVersion.slice(1)
  }
  if (cwdVersion?.startsWith("~")) {
    cwdVersion = cwdVersion.slice(1)
  }
} catch {}

export function AutoUpdater() {
  // TODO handle if user use @next channel, we should auto update to the latest next channel
  const { data: lastestVersion } = useSuspenseQuery({
    queryKey: ["opencoder-version"],
    refetchInterval: 30 * 60 * 1000,
    queryFn: async () => {
      return [
        await fetch("https://unpkg.com/opencoder@latest/package.json").then(
          (res) => res.json() as Promise<{ version: string; minVersion: string }>,
        ),
        await fetch("https://unpkg.com/opencoder@next/package.json").then(
          (res) => res.json() as Promise<{ version: string }>,
        ),
      ]
    },
  })
  const [lastest, next] = lastestVersion
  const target = pkg.version.includes("next") ? next! : lastest!
  const update = useMutation({
    mutationFn: async () => {
      const $ = build$({
        commandBuilder: new CommandBuilder().cwd(env.cwd!),
        requestBuilder: new RequestBuilder(),
      })

      const userAgent = getUserAgent()
      if (userAgent === "npm") {
        await $`npm install -g opencoder@${target.version}`.quiet().text()
      }
      if (userAgent === "yarn") {
        await $`yarn add -g opencoder@${target.version}`.quiet().text()
      }
      if (userAgent === "pnpm") {
        await $`pnpm i -g opencoder@${target.version}`.quiet().text()
      }
      if (userAgent === "bun") {
        await $`bun i -g opencoder@${target.version}`.quiet().text()
      }
    },
  })
  const updateCwd = useMutation({
    mutationFn: async () => {
      const $ = build$({
        commandBuilder: new CommandBuilder().cwd(env.cwd!),
        requestBuilder: new RequestBuilder(),
      })

      if (existsSync(join(env.cwd!, "package.json"))) {
        const pm = await detect({ cwd: env.cwd! })
        const packageJson = JSON.parse(readFileSync(join(env.cwd!, "package.json"), "utf-8"))
        if (
          packageJson.dependencies.opencoder ||
          packageJson.devDependencies.opencoder ||
          packageJson.optionalDependencies.opencoder
        ) {
          if (pm?.name === "npm") {
            await $`npm install opencoder@${target.version}`.quiet().text()
          }
          if (pm?.name === "yarn") {
            await $`yarn add opencoder@${target.version}`.quiet().text()
          }
          if (pm?.name === "pnpm") {
            await $`pnpm add opencoder@${target.version}`.quiet().text()
          }
          if (pm?.name === "bun") {
            await $`bun add opencoder@${target.version}`.quiet().text()
          }
        }
      }
    },
  })
  const shouldUpdateGlobal = lt(currentVersion, target!.version)
  const shouldUpdateCwd = cwdVersion ? lt(cwdVersion, target!.version) : false

  const theme = getTheme()

  useEffect(() => {
    if (shouldUpdateGlobal && import.meta.env.PROD) {
      update.mutate()
    }
  }, [shouldUpdateGlobal])
  useEffect(() => {
    if (shouldUpdateCwd && import.meta.env.PROD) {
      updateCwd.mutate()
    }
  }, [shouldUpdateCwd])

  return (
    <Box flexDirection="row" paddingX={2} paddingY={0}>
      {(update.isPending || updateCwd.isPending) && (
        <>
          <Box>
            <Text color={theme.secondaryText} dimColor wrap="end">
              Auto-updating to v{target!.version}{" "}
              {pkg.version.includes("next") ? "of @next channel" : ""}
            </Text>
          </Box>
        </>
      )}
      {(update.isSuccess || updateCwd.isSuccess) && (
        <Text color={theme.success}>✓ Updated to {target!.version}; Restart to apply</Text>
      )}
      {(update.isError || updateCwd.isError) && (
        <Text color={theme.error}>✗ Auto update failed: try to update manually</Text>
      )}
    </Box>
  )
}
