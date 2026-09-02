export function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

export function splitSeconds(totalSeconds: number): { minutes: number; seconds: number } {
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  }
}

export function formatUtcClock(date: Date): string {
  return date.toISOString().slice(11, 19)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function parseSecondsInput(raw: string | null): number {
  if (!raw) return 0
  const value = Number.parseInt(raw, 10)
  return Number.isNaN(value) ? 0 : value
}

export function clampInput(raw: string, max: number): string {
  return parseSecondsInput(raw) > max ? max.toString() : raw
}