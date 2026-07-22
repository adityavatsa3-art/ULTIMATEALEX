const STRIPPED_TAGS = ["commit_analysis", "context", "function_analysis", "pr_analysis"]

export function stripSystemMessages(content: string): string {
  const regex = new RegExp(`<(${STRIPPED_TAGS.join("|")})>.*?</\\1>\n?`, "gs")
  return content.replace(regex, "").trim()
}
