import { z } from "opencoder"

export default {
  // Tool confirmation settings
  toolConfirmation: {
    // Enable tool confirmation dialog (default: true)
    enabled: true,
    
    // List of tools that should be auto-accepted without confirmation
    // Set to true to auto-accept all tools
    autoAcceptTools: [
      "read_file", // Auto-accept read_file tool
      "think",     // Auto-accept think tool
    ],
    
    // List of bash commands that should be auto-accepted without confirmation
    // Set to true to auto-accept all bash commands
    autoAcceptBashCommands: [
      "ls",        // Auto-accept ls command
      "git status" // Auto-accept git status command
    ],
  },
  
  // Custom tools example
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
