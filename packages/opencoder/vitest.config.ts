import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"
import babel from "vite-plugin-babel"
import path from "node:path"

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.DEV": JSON.stringify("true"),
  },
  test: {
    include: ["test/*.test.tsx", "test/**/*.test.ts", "test/**/*.test.tsx"],
    setupFiles: "./test/setup.ts",
    isolate: false,
    globals: true,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  plugins: [
    tsconfigPaths({ projects: [path.resolve(__dirname, "tsconfig.json")] }),
    babel({
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
    }) as any,
  ],
})
