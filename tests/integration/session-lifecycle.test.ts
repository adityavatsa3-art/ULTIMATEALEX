import { describe, it, expect } from 'vitest'

const GATEWAY = 'http://localhost:8080'

describe('Session Lifecycle', () => {
  it('multiple sequential requests all succeed', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${GATEWAY}/health`)
      expect(res.status).toBe(200)
    }
  })

  it('gateway stays up after a failed upstream request', async () => {
    // Send a request that will fail (no real API keys)
    await fetch(`${GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: 'test' }] })
    })
    // Gateway should still be healthy
    const health = await fetch(`${GATEWAY}/health`)
    expect(health.status).toBe(200)
  })
})
