import EventEmitter from "node:events"
import { vi } from "vitest"

// Fake process.stdout
type FakeStdout = {
  get: () => string
} & NodeJS.WriteStream

const createStdout = (columns?: number): FakeStdout => {
  const stdout = new EventEmitter() as unknown as FakeStdout
  stdout.columns = columns ?? 100

  const write = vi.fn()
  stdout.write = write

  stdout.get = () => write.mock.calls.at(-1)?.[0] as string

  return stdout
}

export default createStdout
