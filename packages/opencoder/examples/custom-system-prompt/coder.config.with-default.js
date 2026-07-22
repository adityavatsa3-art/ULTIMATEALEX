// Example configuration with a custom system prompt that includes the default prompt
export default {
  // Custom system prompt that includes the default prompt with additional instructions
  system: `{{ DEFAULT_PROMPT }}
  
  Make sure to follow these additional guidelines:
  1. Always use descriptive variable names
  2. Add comments for complex logic
  3. Follow the project's coding style
  `
}