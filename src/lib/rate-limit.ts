export const RATE_LIMIT_WINDOW_MS = 10_000
export const RATE_LIMIT_MAX_ATTEMPTS = 5

export function pruneAttempts(
  attempts: readonly number[],
  now: number,
  windowMs = RATE_LIMIT_WINDOW_MS,
): number[] {
  return attempts.filter((time) => now - time < windowMs)
}

export function rateLimitWaitMs(
  attempts: readonly number[],
  now: number,
  max = RATE_LIMIT_MAX_ATTEMPTS,
  windowMs = RATE_LIMIT_WINDOW_MS,
): number {
  const recent = pruneAttempts(attempts, now, windowMs)
  if (recent.length < max) return 0
  const oldest = recent[0] ?? now
  return Math.max(0, windowMs - (now - oldest))
}
