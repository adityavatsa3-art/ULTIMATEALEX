import { transform } from "oxc-transform"
import fs from "node:fs/promises"
import path from "node:path"

const transformed = transform(
  path.join(__dirname, "..", "src/mcp.tsx"),
  await fs.readFile(path.join(__dirname, "..", "src/mcp.tsx"), "utf-8"),
  {
    typescript: {
      onlyRemoveTypeImports: true,
      declaration: { stripInternal: true },
    },
  },
)
await fs.writeFile(path.join(__dirname, "..", "dist/mcp.d.ts"), transformed.declaration!)

console.log("dist/mcp.d.ts")
