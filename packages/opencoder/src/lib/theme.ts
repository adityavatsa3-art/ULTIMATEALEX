export interface Theme {
  bashBorder: string
  permission: string
  secondaryBorder: string
  text: string
  secondaryText: string
  suggestion: string
  // Semantic colors
  success: string
  error: string
  warning: string
  diff: {
    added: string
    removed: string
    addedDimmed: string
    removedDimmed: string
  }
}

// TODO move to AppContext
export function getTheme(): Theme {
  return {
    bashBorder: "#fd5db1",
    permission: "#b1b9f9",
    secondaryBorder: "#888",
    text: "#fff",
    secondaryText: "#999",
    suggestion: "#b1b9f9",
    success: "#4eba65",
    error: "#ff6b80",
    warning: "#ffc107",
    diff: {
      added: "#2a4d3e", // Dark green for additions
      removed: "#4d2a2a", // Dark red for removals
      addedDimmed: "#1e3a2e", // Dimmed dark green
      removedDimmed: "#3a1e1e", // Dimmed dark red
    },
  }
}
