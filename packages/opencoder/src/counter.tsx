import React, { startTransition, Suspense, use, useEffect, useMemo, useState } from "react"
import { render, Text, useInput } from "ink"
import { applyMarkdown } from "./lib/markdown.js"
import dedent from "dedent"
import { atom, useAtom } from "jotai"

const text = dedent`
  # Hello1
  ## Hello1

  This is **markdown** printed in the \`terminal\`
  \`\`\`typescript
  import React, { startTransition, Suspense, use, useEffect, useMemo, useState } from "react"
import { render, Text } from "ink"
import { applyMarkdown } from "./lib/markdown.js"
import dedent from "dedent"
  const x = 1
  \`\`\`
`

const promise: Promise<string> = new Promise<string>((resolve) => {
  setTimeout(() => {
    resolve("Hello")
  }, 300)
})

function Counter() {
  const result = use(promise)
  return <Text color="green">{result}</Text>
}

let lastPromise = promise
async function Counter2() {
  const result = await promise
  return <Text color="green">{result}</Text>
}
Counter2.$$typeof = Symbol.for("react.server.reference")

function RealCounter() {
  const [counter, setCounter] = React.useState(0)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCounter((prevCounter) => prevCounter + 1) // eslint-disable-line unicorn/prevent-abbreviations
    }, 100)

    return () => {
      clearInterval(timer)
    }
  }, [])

  return <Text color="green">{counter} tests passed</Text>
}

function Jotai() {
  const [state, setState] = useAtom(a1)
  useInput((input) => {
    setState(state + 1)
  })
  return <Text>{state}</Text>
}

const a1 = atom(0)
export function App() {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <Counter2 />
      <RealCounter />
      {/* <Jotai /> */}
      <Text>{applyMarkdown(text)}</Text>
    </Suspense>
  )
}

// render(
//   <Suspense fallback={<Text>Bad request...</Text>}>
//     <App />
//   </Suspense>,
// )
