import { describe, expect, it } from 'vitest'
import {
  CITY_MODIFIERS,
  PET_MODIFIERS,
  cityBuffs,
  composeEffectiveStats,
  effectiveBuckets,
  effectiveStat,
  emptyBuffs,
  maxBuffs,
  maxPets,
  normalizeBuffs,
  petsEnabled,
  rawStat,
} from './stat-buffs'
import type { SideStatPanel, WidgetCounts } from './hero-stats'

function panel(value: number): SideStatPanel {
  return {
    infantry: { attack: value, defense: value, lethality: value, health: value },
    lancer: { attack: value, defense: value, lethality: value, health: value },
    marksman: { attack: value, defense: value, lethality: value, health: value },
  }
}

function widgets(overrides: Partial<WidgetCounts> = {}): WidgetCounts {
  return { attack: 0, defense: 0, lethality: 0, health: 0, ...overrides }
}

describe('cityBuffs and maxPets', () => {
  it('expands a city preset to every city modifier', () => {
    const city = cityBuffs(20)
    expect(CITY_MODIFIERS.every((modifier) => city[modifier] === 20)).toBe(true)
  })

  it('toggles every pet modifier at its own cap', () => {
    const pets = maxPets(true)
    expect(PET_MODIFIERS.every((modifier) => pets[modifier] > 0)).toBe(true)
    expect(pets.enemy_lethality).toBe(5)
    expect(pets.enemy_health).toBe(5)
    expect(maxPets(false).enemy_lethality).toBe(0)
    expect(petsEnabled(pets)).toBe(true)
    expect(petsEnabled(maxPets(false))).toBe(false)
  })

  it('clamps values from presets and leaves missing fields off', () => {
    const city = cityBuffs(0)
    city.attack = 99
    city.enemy_attack = -4
    const pets = maxPets(false)
    pets.attack = 99
    pets.enemy_health = 1
    const buffs = normalizeBuffs({ city, pets, gareth: 9 })
    expect(buffs.city.attack).toBe(20)
    expect(buffs.city.enemy_attack).toBe(0)
    expect(buffs.pets.attack).toBe(10)
    expect(buffs.pets.enemy_health).toBe(1)
    expect(buffs.gareth).toBe(5)
  })
})

describe('composeEffectiveStats', () => {
  it('leaves the raw panel unchanged when no buff or widget is active', () => {
    const raw = panel(100)
    expect(composeEffectiveStats(raw, emptyBuffs(), emptyBuffs(), widgets())).toEqual(raw)
  })

  it('adds city, pet and widget percentages before applying the debuff denominator', () => {
    const raw = panel(1000)
    const own = maxBuffs()
    const stats = composeEffectiveStats(raw, own, own, widgets({ attack: 2, lethality: 1 }))
    // attack: up = 20 city + 10 pets + 30 widgets = 60; down = 20 city enemy atk.
    expect(stats.infantry.attack).toBeCloseTo((1100 * 1.6) / 1.2 - 100, 6)
    // lethality: up = 20 + 10 + 15 = 45; down = 5 pets + 5 Gareth = 10.
    expect(stats.infantry.lethality).toBeCloseTo((1100 * 1.45) / 1.1 - 100, 6)
    // Same-stat widgets add, never compound (2 widgets = +30%, not 1.3 * 1.3225).
    expect(stats.infantry.attack).toBeLessThan((1100 * 1.3 * 1.3225) / 1.2 - 100)
  })

  it('applies enemy debuffs from the opponent, not from the own panel', () => {
    const raw = panel(0)
    const own = emptyBuffs()
    const foe = maxBuffs()
    const stats = composeEffectiveStats(raw, own, foe, widgets())
    expect(stats.infantry.attack).toBeCloseTo((100 * 1.0) / 1.2 - 100, 6)
    expect(stats.infantry.defense).toBeCloseTo((100 * 1.0) / 1.3 - 100, 6)
    expect(stats.infantry.lethality).toBeCloseTo((100 * 1.0) / 1.1 - 100, 6)
    expect(stats.infantry.health).toBeCloseTo((100 * 1.0) / 1.05 - 100, 6)
  })

  it('inverts the effective transform for manual edits', () => {
    const buckets = effectiveBuckets(maxBuffs(), maxBuffs(), widgets({ attack: 2, health: 1 }))
    for (const stat of ['attack', 'defense', 'lethality', 'health'] as const) {
      const raw = 123.456
      const effective = effectiveStat(raw, stat, buckets)
      expect(rawStat(effective, stat, buckets)).toBeCloseTo(raw, 6)
    }
  })

  it('matches the max-buff Gen 17 preset panel', () => {
    const raw: SideStatPanel = {
      infantry: { attack: 3511.84, defense: 3511.84, lethality: 2614.5, health: 2614.5 },
      lancer: { attack: 3341.7, defense: 3341.7, lethality: 2448, health: 2448 },
      marksman: { attack: 3511.84, defense: 3511.84, lethality: 2614.5, health: 2614.5 },
    }
    const stats = composeEffectiveStats(
      raw,
      maxBuffs(),
      maxBuffs(),
      widgets({ attack: 1, lethality: 1 }),
    )
    expect(stats.infantry.attack).toBeCloseTo(4264.306667, 5)
    expect(stats.infantry.defense).toBeCloseTo(3511.84, 5)
    expect(stats.infantry.lethality).toBeCloseTo(3478.204545, 5)
    expect(stats.infantry.health).toBeCloseTo(3260.809524, 5)
    expect(stats.lancer.attack).toBeCloseTo(4058.720833, 5)
  })

  it('applies the same effective panel to every class', () => {
    const raw: SideStatPanel = {
      infantry: { attack: 100, defense: 200, lethality: 300, health: 400 },
      lancer: { attack: 100, defense: 200, lethality: 300, health: 400 },
      marksman: { attack: 100, defense: 200, lethality: 300, health: 400 },
    }
    const stats = composeEffectiveStats(raw, maxBuffs(), maxBuffs(), widgets({ attack: 1 }))
    expect(stats.infantry).toEqual(stats.lancer)
    expect(stats.lancer).toEqual(stats.marksman)
  })
})
