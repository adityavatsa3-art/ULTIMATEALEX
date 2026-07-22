import { createMcp } from "opencoder/mcp"
export default {
  mcp: [createMcp({ name: "playwright", command: "npx", args: ["@playwright/mcp@latest"] })],
}
