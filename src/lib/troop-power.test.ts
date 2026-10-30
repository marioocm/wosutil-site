import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TROOP_FC,
  DEFAULT_TROOP_RATIO,
  DEFAULT_TROOP_TIER,
  TROOP_FC_LEVELS,
  TROOP_TIERS,
  allocateTroopCounts,
  formatTroopCount,
  formatTroopPercent,
  moveTroopRatioDivider,
  nudgeTroopRatio,
  parseTroopCount,
  sanitizeTroopCountInput,
  shiftTroopRatioMiddle,
  troopRatioPositions,
} from './troop-power'

describe('DEFAULT_TROOP_RATIO', () => {
  it('splits troops evenly in three ways', () => {
    expect(DEFAULT_TROOP_RATIO[0] + DEFAULT_TROOP_RATIO[1] + DEFAULT_TROOP_RATIO[2]).toBeCloseTo(
      100,
    )
    expect(allocateTroopCounts(150_000, DEFAULT_TROOP_RATIO)).toEqual([50_000, 50_000, 50_000])
  })
})

describe('troop tier options', () => {
  it('lists T1-T12 and FC0-FC10 with T12 / FC10 defaults', () => {
    expect(TROOP_TIERS[0]).toBe(1)
    expect(TROOP_TIERS.at(-1)).toBe(12)
    expect(TROOP_FC_LEVELS[0]).toBe(0)
    expect(TROOP_FC_LEVELS.at(-1)).toBe(10)
    expect(DEFAULT_TROOP_TIER).toBe(12)
    expect(DEFAULT_TROOP_FC).toBe(10)
  })
})

describe('sanitizeTroopCountInput', () => {
  it('keeps digits only and preserves the caret', () => {
    expect(sanitizeTroopCountInput('150,000')).toEqual({ value: '150000', caret: 6 })
    expect(sanitizeTroopCountInput('12a34', 2)).toEqual({ value: '1234', caret: 2 })
  })

  it('strips leading zeros while keeping a single zero', () => {
    expect(sanitizeTroopCountInput('0012')).toEqual({ value: '12', caret: 2 })
    expect(sanitizeTroopCountInput('000')).toEqual({ value: '0', caret: 1 })
  })

  it('caps the amount of digits', () => {
    const result = sanitizeTroopCountInput('1234567890123')
    expect(result.value).toBe('123456789012')
    expect(result.caret).toBe(12)
  })

  it('returns an empty value for input without digits', () => {
    expect(sanitizeTroopCountInput('abc')).toEqual({ value: '', caret: 0 })
  })
})

describe('parseTroopCount', () => {
  it('parses plain and grouped numbers', () => {
    expect(parseTroopCount('150000')).toBe(150_000)
    expect(parseTroopCount('150,000')).toBe(150_000)
    expect(parseTroopCount(' 0 ')).toBe(0)
  })

  it('returns null for empty or digitless values', () => {
    expect(parseTroopCount('')).toBeNull()
    expect(parseTroopCount('abc')).toBeNull()
    expect(parseTroopCount(null)).toBeNull()
    expect(parseTroopCount(undefined)).toBeNull()
  })
})

describe('formatTroopCount', () => {
  it('groups thousands with commas', () => {
    expect(formatTroopCount(0)).toBe('0')
    expect(formatTroopCount(999)).toBe('999')
    expect(formatTroopCount(1000)).toBe('1,000')
    expect(formatTroopCount(1234567)).toBe('1,234,567')
  })
})

describe('formatTroopPercent', () => {
  it('uses at most one decimal and trims whole numbers', () => {
    expect(formatTroopPercent(100 / 3)).toBe('33.3%')
    expect(formatTroopPercent(50)).toBe('50%')
    expect(formatTroopPercent(33.04)).toBe('33%')
  })
})

describe('allocateTroopCounts', () => {
  it('always returns counts that add up to the total', () => {
    expect(allocateTroopCounts(101, [50, 30, 20])).toEqual([51, 30, 20])
    expect(allocateTroopCounts(100, [33.3, 33.3, 33.4])).toEqual([33, 33, 34])
  })

  it('returns zero counts for an empty total', () => {
    expect(allocateTroopCounts(0, [50, 30, 20])).toEqual([0, 0, 0])
  })
})

describe('moveTroopRatioDivider', () => {
  it('adjusts Infantry and Lancer while keeping Marksman fixed', () => {
    const next = moveTroopRatioDivider([40, 30, 30], 0, 50)
    expect(next).toEqual([50, 20, 30])
  })

  it('adjusts Lancer and Marksman while keeping Infantry fixed', () => {
    const next = moveTroopRatioDivider([40, 30, 30], 1, 80)
    expect(next).toEqual([40, 40, 20])
  })

  it('clamps dividers to the available range', () => {
    expect(moveTroopRatioDivider([40, 30, 30], 0, 100)).toEqual([70, 0, 30])
    expect(moveTroopRatioDivider([40, 30, 30], 1, 0)).toEqual([40, 0, 60])
  })
})

describe('shiftTroopRatioMiddle', () => {
  it('transfers between Infantry and Marksman keeping Lancer fixed', () => {
    expect(shiftTroopRatioMiddle([40, 20, 40], 10)).toEqual([50, 20, 30])
    expect(shiftTroopRatioMiddle([40, 20, 40], -10)).toEqual([30, 20, 50])
  })

  it('stops when either outer segment reaches zero', () => {
    expect(shiftTroopRatioMiddle([40, 20, 40], 100)).toEqual([80, 20, 0])
    expect(shiftTroopRatioMiddle([40, 20, 40], -100)).toEqual([0, 20, 80])
  })
})

describe('nudgeTroopRatio', () => {
  it('moves each control one percent in the pressed direction', () => {
    expect(nudgeTroopRatio([40, 30, 30], 'infantry-lancer', 1)).toEqual([41, 29, 30])
    expect(nudgeTroopRatio([40, 30, 30], 'lancer-marksman', 1)).toEqual([40, 31, 29])
    expect(nudgeTroopRatio([40, 30, 30], 'lancer', 1)).toEqual([41, 30, 29])
  })
})

describe('troopRatioPositions', () => {
  it('returns both divider positions', () => {
    expect(troopRatioPositions([40, 30, 30])).toEqual([40, 70])
  })
})
