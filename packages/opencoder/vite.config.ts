import fs from "node:fs"
import { dts } from "rolldown-plugin-dts"
import path from "node:path"
import { defineConfig } from "rolldown-vite"
import tsconfigPaths from "vite-tsconfig-paths"
import babel from "vite-plugin-babel"

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.DEV": "'false'",
  },
  ssr: {
    noExternal: true,
    resolve: {},
  },
  optimizeDeps: {
    include: ["ink > cli-boxes"],
    rollupOptions: {},
  },
  build: {
    // enableBuildReport: true,
    target: "esnext",
    minify: "esbuild",
    sourcemap: process.env.SOURCE_MAP === "true",
    commonjsOptions: {
      include: ["cli-boxes"],
      extensions: [".js", ".mjs"],
      transformMixedEsModules: true,
      strictRequires: ["cli-boxes"],
      esmExternals: true,
    },
    rollupOptions: {
      input: {
        cli: "./src/index.ts",
        lib: "./src/lib.ts",
        mcp: "./src/mcp.tsx",
        core: "./src/core.tsx",
      },
      external: [
        "ai",
        "@ai-sdk/google",
        "@ai-sdk/openai",
        "@ai-sdk/anthropic",
        "@vscode/ripgrep",
        "@lancedb/lancedb",
        "unconfig",
        "cli-boxes",
        "linkedom",
        /node:/,
        ...require("repl")._builtinLibs,
      ],
      output: {
        minifyInternalExports: false,
      },
      onwarn(warning: any, warn: any) {
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" ||
          warning.code === "EVAL" ||
          warning.code === "SOURCEMAP_ERROR" ||
          warning.code === "UNUSED_EXTERNAL_IMPORT" ||
          warning.code === "INVALID_ANNOTATION" ||
          warning.code === "CIRCULAR_DEPENDENCY"
        ) {
          return
        }
        warn(warning)
      },
    },
  },
  plugins: [
    // dts(),
    tsconfigPaths({ projects: [path.resolve(__dirname, "tsconfig.json")] }),
    (babel as any)({
      include: /\.tsx$/,
      babelConfig: {
        plugins: [
          [path.resolve(__dirname, "node_modules/babel-plugin-react-compiler"), {}],
          process.env.NODE_ENV === "development" && [
            "@locator/babel-jsx/dist",
            {
              env: "development",
            },
          ],
          process.env.NODE_ENV === "development" && ["@hh.ru/babel-plugin-react-displayname"],
        ].filter((v) => !!v),
      },
    }),
    {
      name: "write-headers",
      closeBundle() {
        setTimeout(() => {
          const cli = fs.readFileSync(path.resolve(__dirname, "dist/cli.js"), "utf-8")
          fs.writeFileSync(path.resolve(__dirname, "dist/cli.js"), `#!/usr/bin/env node\n${cli}`)
        }, 10)
      },
    },
  ],
  experimental: {
    enableNativePlugin: true,
    skipSsrTransform: true,
  },
})
