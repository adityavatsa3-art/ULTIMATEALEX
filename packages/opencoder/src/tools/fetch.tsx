import { defineTool } from "@/tools/ai.js"
// @ts-ignore
import TurndownService from "@joplin/turndown"
// @ts-ignore
import { gfm } from "@joplin/turndown-plugin-gfm"
import Defuddle from "defuddle"
import { Text } from "ink"
import React from "react"
import { z } from "zod"
import { parseHTML } from "linkedom"
import { config } from "@/lib/config.js"

function cleanRedundantEmptyLines(text: string) {
  const lines = text.split(/\r?\n/g)
  const mappedFlag = lines.map((line) => Boolean(line.trim()))

  return lines.filter((_line, i) => mappedFlag[i] || mappedFlag[i - 1]).join("\n")
}

function turndown(document: Document) {
  const blacklistedElements = new Set([
    "head",
    "title",
    "meta",
    "script",
    "style",
    "path",
    "svg",
    "br",
    "hr",
    "link",
    "object",
    "embed",
    '[aria-label="Banner"]',
    '[aria-roledescription="Carousel"]',
  ])

  const blacklistedAttributes = [
    "style",
    "ping",
    "src",
    "item.*",
    "aria.*",
    "js.*",
    "data-.*",
    "tabindex",
    "onerror",
  ]

  // Remove blacklisted elements
  blacklistedElements.forEach((tag) => {
    const elements = document.querySelectorAll(tag)
    elements.forEach((element) => {
      element.remove()
    })
  })

  // Remove blacklisted attributes
  const elements = document.querySelectorAll("*")
  elements.forEach((element) => {
    blacklistedAttributes.forEach((attrPattern) => {
      const regex = new RegExp(`^${attrPattern}$`)
      Array.from(element.attributes).forEach((attr: any) => {
        if (regex.test(attr.name)) {
          element.removeAttribute(attr.name)
        }
      })
    })
  })

  // Remove empty elements
  elements.forEach((element) => {
    if (!element.hasAttributes() && element.textContent?.trim() === "") {
      element.remove()
    }
  })

  document.querySelectorAll("img[src],img[data-src]").forEach((x) => {
    const src = x.getAttribute("src") || x.getAttribute("data-src")
    if (src?.startsWith("data:")) {
      x.setAttribute("src", "blob:opaque")
    }
    x.removeAttribute("data-src")
    x.removeAttribute("srcset")
  })

  const treeWalker = document.createTreeWalker(document, 0x80) // Only show comment nodes

  let currentNode: Node | null
  while ((currentNode = treeWalker.nextNode())) {
    currentNode.parentNode?.removeChild(currentNode) // Remove each comment node
  }

  const main = document.querySelector(
    "main, #main, [role='main'], #content, .main, .content, article, [role='article']",
  )

  let html: string

  if (main) {
    html = main.innerHTML
  } else {
    // @ts-ignore
    const reader = new Defuddle(document, { keepClasses: false })
    const result = reader.parse()
    html = result.content
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  })
  turndownService.use(gfm)

  turndownService.remove("footer")
  turndownService.remove("button")
  turndownService.remove("form")
  turndownService.remove("img")
  turndownService.remove("aside")
  turndownService.remove("svg")
  turndownService.remove("script")
  turndownService.remove('[aria-label^="Advertisement"]')

  return turndownService.turndown(cleanRedundantEmptyLines(html)) as string
}

export const tool = defineTool({
  description:
    config.experimental?.toolPrompt?.fetch ??
    `Fetch remote url and return content as markdown format`,
  parameters: z.object({
    url: z.string().describe("Target url (eg https://github.com/kepano/defuddle)"),
  }),
  execute: async ({ url }) => {
    const res = await fetch(url)
    if (!res.ok) {
      return `Failed to fetch ${url}: status ${res.status} ; ${res.statusText}`
    }

    const { document } = parseHTML(await res.text())
    globalThis.document = document

    const markdown = turndown(document)
    return markdown
  },
  render: ({ args }) => {
    return <Text>Fetch {args?.url}</Text>
  },
  renderTitle: ({ args, state }) => {
    return <Text>{state === "result" ? "Fetch" : "Fetching..."}</Text>
  },
})
