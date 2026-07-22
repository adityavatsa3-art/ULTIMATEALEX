import { openai } from "ai"

// next: use /sync command to index the codebase every time you need to
export default {
  experimental: {
    codeBaseIndex: {
      enabled: true,
      model: openai.embedding("text-embedding-ada-002"),
    },
  },
}
