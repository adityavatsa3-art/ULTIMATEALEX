import os from "os"
import boxen from "boxen"
import { render, Box, Text } from "ink"
import React, { useEffect, useState } from "react"
import stripAnsi from "strip-ansi"
import pty from "@homebridge/node-pty-prebuilt-multiarch"

const shell = os.platform() === "win32" ? "powershell.exe" : "zsh"

// function spawn(
//   shell: string,
//   args: [],
//   options: {
//     name?: "xterm-256color"
//     cols: number
//     rows: number
//     cwd?: string | undefined
//     env?: NodeJS.ProcessEnv | undefined
//     encoding?: ConstructorParameters<typeof TextDecoder>[0] | undefined
//   },
// ) {
//   const subprocess = Bun.spawn(["unbuffer", "-p", shell, ...args], {
//     stdin: "pipe",
//     stdout: "pipe",
//     stderr: "pipe",
//   })

//   const decoder = new TextDecoder(options.encoding || "utf-8")
//   let cols = options.cols
//   let rows = options.rows
//   subprocess.stdin.write(` HISTCONTROL=ignorespace\n`)
//   subprocess.stdin.write(` stty cols ${+cols}\n`)
//   subprocess.stdin.write(` stty rows ${+rows}\n`)
//   subprocess.stdin.write(` stty echo\n`)
//   return {
//     cols,
//     rows,
//     onData: async (cb: (data: string) => void) => {
//       const reader = subprocess.stdout.getReader()
//       while (true) {
//         const { done, value: byteValue } = await reader.read()
//         if (done) break
//         const value = decoder.decode(byteValue)
//         cb(value)
//       }
//     },
//     write: (data: string) => {
//       subprocess.stdin.write(data)
//       subprocess.stdin.flush()
//     },
//     resize: (c: number, r: number) => {
//       cols = c
//       rows = r
//     },
//     kill: () => {
//       subprocess.stdin.end()
//       subprocess.kill()
//     },
//   }
// }

// function App() {
//   const [terminal, setTerminal] = useState<string>("")

//   useEffect(() => {
//     var ptyProcess = spawn(shell, [], {
//       name: "xterm-256color",
//       cols: 40,
//       rows: 20,
//       cwd: process.env.HOME,
//       env: process.env,
//     })
//     setTimeout(() => {
//       ptyProcess.onData((data) => {
//         setTerminal((p) => p + data)
//       })

//       ptyProcess.write("ls\r")
//     }, 1e3)
//   }, [setTerminal])

//   console.log(terminal)

//   return (
//     <Box flexDirection="column" gap={1}>
//       <Text>Terminal</Text>
//       <Box borderStyle="round" borderColor="green" padding={1} height={30} width={80}>
//         <Text>{terminal.trim()}</Text>
//       </Box>
//     </Box>
//   )
// }

// console.clear()
// render(<App />)

// setTimeout(() => {}, 100000)

var ptyProcess = pty.spawn(shell, [], {
  name: "xterm-256color",
  cols: 40,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env,
})

ptyProcess.onData((data) => {
  process.stdout.write(data)
})

ptyProcess.write("ls\r")
ptyProcess.resize(100, 40)
ptyProcess.write("ls\r")
