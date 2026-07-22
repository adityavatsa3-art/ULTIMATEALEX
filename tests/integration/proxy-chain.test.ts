import { describe, it, expect, beforeAll } from 'vitest'

const GATEWAY = 'http://localhost:8080'

describe('Proxy Chain Integration', () => {
  beforeAll(async () => {
    // Give services time to start in CI
    await new Promise(r => setTimeout(r, 1000))
  })

  it('GET /health returns 200', async () => {
    const res = await fetch(`${GATEWAY}/health`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('healthy')
  })

  it('POST /v1/chat/completions with no key returns 503 or proxied response', async () => {
    const res = await fetch(`${GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }]
      })
    })
    // Either proxied (200) or exhausted (503) — both are valid without real keys
    expect([200, 503]).toContain(res.status)
  })

  it('POST with oversized payload returns 413', async () => {
    const bigPayload = 'x'.repeat(11 * 1024 * 1024) // 11MB
    const res = await fetch(`${GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(bigPayload.length) },
      body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: bigPayload }] })
    })
    expect(res.status).toBe(413)
  })

  it('POST with wrong content-type returns 415', async () => {
    const res = await fetch(`${GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello'
    })
    expect(res.status).toBe(415)
  })
})
