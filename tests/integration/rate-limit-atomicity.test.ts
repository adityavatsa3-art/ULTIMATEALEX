import { describe, it, expect } from 'vitest'

const GATEWAY = 'http://localhost:8080'
const CONCURRENT = 20

describe('Rate Limit Atomicity', () => {
  it('handles concurrent requests without race conditions', async () => {
    const requests = Array.from({ length: CONCURRENT }, (_, i) =>
      fetch(`${GATEWAY}/health`).then(r => r.status)
    )
    const statuses = await Promise.all(requests)
    const ok = statuses.filter(s => s === 200)
    const tooMany = statuses.filter(s => s === 429)
    // All should be either 200 or 429, none should be 500 (race condition)
    expect(ok.length + tooMany.length).toBe(CONCURRENT)
    statuses.forEach(s => expect([200, 429]).toContain(s))
  })
})
