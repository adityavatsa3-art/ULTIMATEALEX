export function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let currentLine = ""

  for (const char of text) {
    if ([...currentLine].length < width) {
      currentLine += char
    } else {
      lines.push(currentLine)
      currentLine = char
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(number) // eg. "1321" => "1.3K"
    .toLowerCase() // eg. "1.3K" => "1.3k"
}
