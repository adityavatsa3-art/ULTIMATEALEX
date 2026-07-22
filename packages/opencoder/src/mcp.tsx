import { experimental_createMCPClient, tool } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import { DuckDuckGoClient } from "@agentic/duck-duck-go"
import { createAISDKTools } from "@agentic/ai-sdk"
import { SearxngClient } from "@agentic/searxng"
import { z } from "zod"
import { BraveSearchClient } from "@agentic/brave-search"
import { SafeSearchType, search } from "duck-duck-scrape"
import type { CoderTool } from "@/tools/ai.js"
import React from "react"

export async function playwright({
  executablePath,
  runner,
}: { executablePath?: string; runner?: "npx" | "bunx" } = {}): Promise<Record<string, CoderTool>> {
  const getChromeExecutablePath = () => {
    if (process.platform === "win32") {
      return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    }
    if (process.platform === "darwin") {
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    }
    return "/usr/bin/google-chrome"
  }

  const transport = new Experimental_StdioMCPTransport({
    command: runner === "npx" ? "npx" : "bunx",
    args: [
      "@playwright/mcp@latest",
      "--executable-path",
      executablePath || getChromeExecutablePath(),
    ],
  })
  const client = await experimental_createMCPClient({
    name: "playwright",
    transport,
  })
  return await client.tools()
}

export async function webSearch({
  provider,
}: {
  /**
   * The provider to use for the web search.
   *
   * - `duckduckgo`: Uses DuckDuckGo for the search.
   * - `brave`: Uses Brave Search for the search.
   * - `searxng`: Uses SearxNG for the search. Requires SEARXNG_API_BASE_URL env
   */
  provider?: "duckduckgo" | "brave" | "searxng"
} = {}): Promise<Record<string, CoderTool>> {
  if (provider === "duckduckgo" || !provider) {
    return {
      search_web: {
        description: "Searches the web using DuckDuckGo for a given query.",
        parameters: z.object({
          query: z.string({ description: "Search query" }).min(1).max(128),
          maxResults: z.number().min(1).max(100).optional(),
        }),
        async *generate({ query, maxResults }) {
          yield <span>Searching...</span>
          const results = await search(
            query,
            {
              safeSearch: SafeSearchType.STRICT,
            },
            {
              uri_modifier: (rawUrl: string) => {
                const url = new URL(rawUrl)
                url.searchParams.delete("ss_mkt") // remove the parameter
                return url.toString()
              },
            },
          )
          yield <span>Found {results.results.length} results</span>
          yield `Here are the results: <search-results>${results.results
            .map((result) => {
              return `<search-result>
              <title>${result.title}</title>
              <description>${result.description}</description>
              <url>${result.url}</url>
            </search-result>`
            })
            .join("")}</search-results>`
        },
      },
    }
  }
  if (provider === "brave") {
    const client = new BraveSearchClient()
    return {
      search_web: {
        description:
          "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. " +
          "Use this for broad information gathering, recent events, or when you need diverse web sources. " +
          "Maximum 20 results per request, with offset for pagination. ",
        parameters: z.object({
          query: z.string({ description: "Search query" }).min(1).max(128),
          maxResults: z.number().min(1).max(100).optional(),
        }),
        async *generate({ query, maxResults }) {
          yield <span>Searching...</span>
          const results = await client.search({
            query,
            count: maxResults || 10,
          })
          yield <span>Found {results.web?.results?.length} results</span>
          yield `Here are the results: <search-results>${results.web?.results
            ?.map((result) => {
              return `<search-result>
              <title>${result.title}</title>
              <description>${result.description}</description>
              <url>${result.url}</url>
            </search-result>`
            })
            .join("")}</search-results>`
        },
      },
    }
  }
  if (provider === "searxng") {
    const client = new SearxngClient()
    return createAISDKTools(client)
  }
  throw new Error(`Unsupported provider: ${provider}`)
}

export async function createMcp({
  name,
  command,
  args,
}: { name: string; command: string; args: string[] }): Promise<Record<string, CoderTool>> {
  const transport = new Experimental_StdioMCPTransport({
    command,
    args,
  })
  const client = await experimental_createMCPClient({
    name,
    transport,
  })
  return await client.tools()
}
