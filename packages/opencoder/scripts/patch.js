const packageJson = await Bun.file("./node_modules/ai/package.json").text()
const viteNode = await Bun.file("./node_modules/.bin/vite-node").text()

const updatedPackageJson = packageJson.replace(
  "\"import\": \"./rsc/dist/rsc-client.mjs\"",
  "\"import\": \"./rsc/dist/rsc-server.mjs\"",
)

Bun.write("./node_modules/ai/package.json", updatedPackageJson)
Bun.write(
  "./node_modules/.bin/vite-node",
  viteNode.replace("#!/usr/bin/env node", "#!/usr/bin/env bun"),
)
