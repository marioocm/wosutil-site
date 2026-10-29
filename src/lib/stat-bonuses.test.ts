import { describe, expect, it } from 'vitest'
import {
  compareStatBonuses,
  formatStatBonus,
  normalizeStatBonus,
  parseStatBonus,
  sanitizeStatBonusInput,
  STAT_BONUSES,
  statBonusCents,
} from './stat-bonuses'

describe('STAT_BONUSES', () => {
  it('defines the twelve stat rows in game order', () => {
    expect(STAT_BONUSES).toHaveLength(12)
    expect(STAT_BONUSES[0]?.label).toBe('Infantry Attack')
    expect(STAT_BONUSES[11]?.label).toBe('Marksman Health')
  })
})

describe('parseStatBonus', () => {
  it('parses integers and decimals', () => {
    expect(parseStatBonus('1575.2')).toBe(1575.2)
    expect(parseStatBonus('-42.25')).toBe(-42.25)
    expect(parseStatBonus('0')).toBe(0)
  })

  it('returns null for empty or invalid values', () => {
    expect(parseStatBonus('')).toBeNull()
    expect(parseStatBonus('   ')).toBeNull()
    expect(parseStatBonus('abc')).toBeNull()
    expect(parseStatBonus(null)).toBeNull()
    expect(parseStatBonus(undefined)).toBeNull()
  })
})

describe('sanitizeStatBonusInput', () => {
  it('keeps at most two decimals', () => {
    expect(sanitizeStatBonusInput('12.345').value).toBe('12.34')
    expect(sanitizeStatBonusInput('12.3').value).toBe('12.3')
    expect(sanitizeStatBonusInput('12').value).toBe('12')
  })

  it('strips spaces, signs, percentages and letters', () => {
    expect(sanitizeStatBonusInput(' +1 575,2 % ').value).toBe('1575.2')
    expect(sanitizeStatBonusInput('abc').value).toBe('')
  })

  it('keeps a leading minus and a single decimal separator', () => {
    expect(sanitizeStatBonusInput('-5.25').value).toBe('-5.25')
    expect(sanitizeStatBonusInput('5.2.5').value).toBe('5.25')
  })

  it('preserves the caret when invalid characters are removed', () => {
    expect(sanitizeStatBonusInput('12.345', 4)).toEqual({ value: '12.34', caret: 4 })
    expect(sanitizeStatBonusInput('1a2', 2)).toEqual({ value: '12', caret: 1 })
  })
})

describe('statBonusCents', () => {
  it('rounds values to two decimals', () => {
    expect(statBonusCents(12.345)).toBe(1235)
    expect(statBonusCents(12.344)).toBe(1234)
    expect(statBonusCents(-12.345)).toBe(-1234)
  })
})

describe('formatStatBonus', () => {
  it('always shows two decimals', () => {
    expect(formatStatBonus(1575.2)).toBe('1575.20')
    expect(formatStatBonus(0)).toBe('0.00')
    expect(formatStatBonus(-42.255)).toBe('-42.25')
  })
})

describe('normalizeStatBonus', () => {
  it('formats valid input and clears invalid input', () => {
    expect(normalizeStatBonus('1575.2')).toBe('1575.20')
    expect(normalizeStatBonus(' 7 ')).toBe('7.00')
    expect(normalizeStatBonus('')).toBe('')
    expect(normalizeStatBonus('abc')).toBe('')
  })
})

describe('compareStatBonuses', () => {
  it('marks the higher value green and the lower value red', () => {
    expect(compareStatBonuses('1575.2', '2109.9')).toEqual({
      left: 'lower',
      right: 'higher',
    })
    expect(compareStatBonuses('2109.9', '1575.2')).toEqual({
      left: 'higher',
      right: 'lower',
    })
  })

  it('compares two-decimal values numerically', () => {
    expect(compareStatBonuses('100.01', '100.02')).toEqual({
      left: 'lower',
      right: 'higher',
    })
    expect(compareStatBonuses('100.004', '100.00')).toEqual({
      left: 'equal',
      right: 'equal',
    })
  })

  it('treats equal values as neutral', () => {
    expect(compareStatBonuses('1575.20', '1575.2')).toEqual({
      left: 'equal',
      right: 'equal',
    })
  })

  it('stays neutral while either side is empty or invalid', () => {
    expect(compareStatBonuses('', '2109.9')).toEqual({
      left: 'empty',
      right: 'empty',
    })
    expect(compareStatBonuses('1575.2', '')).toEqual({
      left: 'empty',
      right: 'empty',
    })
    expect(compareStatBonuses('abc', '2109.9')).toEqual({
      left: 'empty',
      right: 'empty',
    })
  })

  it('compares negative bonuses numerically', () => {
    expect(compareStatBonuses('-5.25', '-5.20')).toEqual({
      left: 'lower',
      right: 'higher',
    })
  })
})
