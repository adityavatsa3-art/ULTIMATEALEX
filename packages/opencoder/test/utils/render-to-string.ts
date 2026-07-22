import { render } from "rink2"
import createStdout from "./create-stdout.js"
import delay from "delay"

export const renderToString: (
  node: React.ReactElement,
  options?: { columns?: number; delay?: number },
) => Promise<string> = async (node, options) => {
  const stdout = createStdout(options?.columns ?? 100)

  const instance = render(node, {
    stdout,
    debug: false,
    exitOnCtrlC: false,
  })

  await delay(options?.delay ?? 10) // Add delay to wait for render

  const output = stdout.get()
  instance.unmount() // Clean up the render instance
  return output
}
