import { describe, it, expect } from 'vitest'

const GATEWAY = 'http://localhost:8080'
const CONCURRENT_USERS = 50

describe('Load: Concurrent Request Handling', () => {
  it(`handles ${CONCURRENT_USERS} concurrent health checks`, async () => {
    const start = Date.now()
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_USERS }, () =>
        fetch(`${GATEWAY}/health`).then(r => ({ status: r.status, ok: r.ok }))
      )
    )
    const elapsed = Date.now() - start
    const succeeded = results.filter(r => r.status === 'fulfilled' && (r as any).value.ok).length
    console.log(`${succeeded}/${CONCURRENT_USERS} succeeded in ${elapsed}ms`)
    // At least 80% should succeed
    expect(succeeded).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8)
  })
})
