import { describe, expect, it } from 'vitest'
import {
  pruneAttempts,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  rateLimitWaitMs,
} from './rate-limit'

describe('pruneAttempts', () => {
  it('drops attempts outside the rolling window', () => {
    expect(pruneAttempts([0, 4_000, 9_999], 10_000)).toEqual([4_000, 9_999])
    expect(pruneAttempts([0], 10_000)).toEqual([])
  })
})

describe('rateLimitWaitMs', () => {
  it('allows attempts below the limit', () => {
    expect(rateLimitWaitMs([1_000, 2_000, 3_000], 3_000)).toBe(0)
  })

  it('waits until the oldest attempt leaves the window', () => {
    const now = 13_000
    const attempts = [4_000, 5_000, 6_000, 7_000, 8_000]
    expect(attempts).toHaveLength(RATE_LIMIT_MAX_ATTEMPTS)
    expect(rateLimitWaitMs(attempts, now)).toBe(RATE_LIMIT_WINDOW_MS - (now - 4_000))
  })

  it('ignores attempts that already left the window', () => {
    expect(rateLimitWaitMs([0, 1_000, 2_000, 3_000, 4_000], 15_000)).toBe(0)
  })

  it('supports a custom limit and window', () => {
    expect(rateLimitWaitMs([1_000, 2_000], 2_000, 2, 5_000)).toBe(4_000)
  })
})
