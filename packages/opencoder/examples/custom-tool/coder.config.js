import { z } from "opencoder"
export default {
  customTools: {
    get_current_time: {
      description: "Get the current time",
      parameters: z.object({ format: z.enum(["iso", "unix"]) }),
      execute: async () => {
        return new Date().toISOString()
      },
    },
  },
}
