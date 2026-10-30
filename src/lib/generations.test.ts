import { describe, expect, it } from 'vitest'
import {
  GENERATIONS,
  getGenerationLineup,
  getGenerationPreset,
  MAX_GENERATION,
  MIN_GENERATION,
} from './generations'
import { getHeroById, TROOP_TYPES } from './heroes'

describe('GENERATIONS', () => {
  it('covers every generation from 1 to 17 in order', () => {
    expect(MIN_GENERATION).toBe(1)
    expect(MAX_GENERATION).toBe(17)
    expect(GENERATIONS.map((preset) => preset.generation)).toEqual(
      Array.from({ length: 17 }, (_, index) => index + 1),
    )
  })

  it('matches the era profile from HERO_META', () => {
    expect(getGenerationPreset(1)).toMatchObject({
      tier: 10,
      fc: 0,
      baseStat: 200,
      totalTroops: 300_000,
    })
    expect(getGenerationPreset(3)).toMatchObject({
      tier: 10,
      fc: 0,
      baseStat: 300,
      totalTroops: 800_000,
    })
    expect(getGenerationPreset(4)).toMatchObject({
      tier: 10,
      fc: 5,
      baseStat: 350,
      totalTroops: 1_250_000,
    })
    expect(getGenerationPreset(5)).toMatchObject({
      tier: 11,
      fc: 8,
      baseStat: 400,
      totalTroops: 1_300_000,
    })
    expect(getGenerationPreset(10)).toMatchObject({
      tier: 12,
      fc: 10,
      baseStat: 650,
      totalTroops: 1_550_000,
    })
    expect(getGenerationPreset(17)).toMatchObject({
      tier: 12,
      fc: 10,
      baseStat: 1000,
      totalTroops: 1_900_000,
    })
  })

  it('uses only heroes available at that generation in both lineups', () => {
    for (const preset of GENERATIONS) {
      for (const side of ['left', 'right'] as const) {
        const lineup = getGenerationLineup(preset, side)
        const shares = lineup.ratio.reduce((sum, share) => sum + share, 0)
        expect(shares).toBe(100)

        for (const { id } of TROOP_TYPES) {
          const hero = getHeroById(lineup.heroes[id])
          expect(hero).not.toBeNull()
          expect(hero?.type).toBe(id)
          expect(hero?.generation).not.toBeNull()
          expect(hero?.generation ?? 0).toBeLessThanOrEqual(preset.generation)
        }
      }
    }
  })
})
