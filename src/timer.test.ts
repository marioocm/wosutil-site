import { describe, expect, it } from 'vitest'
import { clamp, clampInput, formatUtcClock, pad2, parseSecondsInput, splitSeconds } from './timer'

describe('pad2', () => {
  it('pads single digits with a leading zero', () => {
    expect(pad2(0)).toBe('00')
    expect(pad2(7)).toBe('07')
  })

  it('leaves two-digit values unchanged', () => {
    expect(pad2(59)).toBe('59')
  })
})

describe('splitSeconds', () => {
  it('splits total seconds into minutes and seconds', () => {
    expect(splitSeconds(103)).toEqual({ minutes: 1, seconds: 43 })
  })

  it('handles zero', () => {
    expect(splitSeconds(0)).toEqual({ minutes: 0, seconds: 0 })
  })

  it('handles the maximum supported duration', () => {
    expect(splitSeconds(3599)).toEqual({ minutes: 59, seconds: 59 })
  })
})

describe('formatUtcClock', () => {
  it('formats a date as UTC HH:MM:SS', () => {
    expect(formatUtcClock(new Date('2026-01-01T12:34:56Z'))).toBe('12:34:56')
  })

  it('pads hours, minutes and seconds', () => {
    expect(formatUtcClock(new Date('2026-01-01T03:04:05Z'))).toBe('03:04:05')
  })
})

describe('clamp', () => {
  it('clamps values within the bounds', () => {
    expect(clamp(120, 0, 99)).toBe(99)
    expect(clamp(-5, 0, 99)).toBe(0)
    expect(clamp(42, 0, 99)).toBe(42)
  })
})

describe('clampInput', () => {
  it('clamps numeric strings above the maximum', () => {
    expect(clampInput('60', 59)).toBe('59')
    expect(clampInput('99', 59)).toBe('59')
  })

  it('leaves in-range values unchanged', () => {
    expect(clampInput('42', 59)).toBe('42')
    expect(clampInput('0', 59)).toBe('0')
  })

  it('leaves empty and invalid input unchanged', () => {
    expect(clampInput('', 59)).toBe('')
    expect(clampInput('abc', 59)).toBe('abc')
  })
})

describe('parseSecondsInput', () => {
  it('parses a numeric string', () => {
    expect(parseSecondsInput('43')).toBe(43)
  })

  it('returns zero for empty or invalid input', () => {
    expect(parseSecondsInput('')).toBe(0)
    expect(parseSecondsInput('abc')).toBe(0)
    expect(parseSecondsInput(null)).toBe(0)
  })
})