import { EventEmitter } from "node:events"
import { vi } from "vitest"

export const createStdin = () => {
  const stdin = new EventEmitter() as unknown as NodeJS.ReadStream
  stdin.isTTY = true
  stdin.setRawMode = vi.fn(() => stdin)
  stdin.setEncoding = vi.fn(() => stdin)
  stdin.read = vi.fn()
  stdin.unref = vi.fn(() => stdin)
  stdin.ref = vi.fn(() => stdin)
  return stdin
}

export const emitReadable = (stdin: NodeJS.ReadStream, chunk: string) => {
  const read = stdin.read as ReturnType<typeof vi.fn>
  read.mockImplementationOnce(() => chunk)
  read.mockImplementationOnce(() => null)
  stdin.emit("readable")
  read.mockClear()
}
