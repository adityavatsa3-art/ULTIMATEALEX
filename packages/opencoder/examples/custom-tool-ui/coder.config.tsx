// @ts-nocheck enable to ignore the errors from the opencoder package, you can safely remove this line
import { z, React } from "opencoder"
import { webSearch } from "opencoder/mcp"

export default {
  customTools: {
    get_current_time: {
      description: "Get the current time",
      parameters: z.object({ format: z.enum(["iso", "unix"]) }),
      async *generate() {
        yield (
          <div style={{ flexDirection: "column" }}>
            <span>Getting current time</span>
            <span style={{ color: "gray" }}>...</span>
          </div>
        )
        await new Promise((resolve) => setTimeout(resolve, 2000))
        yield <span>Current time: {new Date().toISOString()}</span>
        yield new Date().toISOString()
      },
    },
  },
  mcp: [webSearch()],
}
