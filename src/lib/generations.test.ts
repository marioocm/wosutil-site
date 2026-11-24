import { describe, expect, it } from 'vitest'
import { parseGenerationPresets, type GenerationPreset } from './generations'

function preset(generation: number): GenerationPreset {
  return {
    generation,
    tier: 12,
    fc: 10,
    t12Skills: 24,
    baseStat: 900,
    totalTroops: 1_800_000,
    attack: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'vulcanus' },
      ratio: [51, 49, 0],
      joiners: ['jessie', 'jasser', 'patrick', 'seo-yoon'],
    },
    defense: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'cara' },
      ratio: [43, 13, 44],
      joiners: ['ling-xue', 'lumak-bokan', 'patrick'],
    },
  }
}

function payload(generations: unknown[]): unknown {
  return { generations }
}

describe('parseGenerationPresets', () => {
  it('sorts the API presets by generation', () => {
    const parsed = parseGenerationPresets(payload([preset(2), preset(1)]))
    expect(parsed.map((item) => item.generation)).toEqual([1, 2])
    expect(parsed[1]?.t12Skills).toBe(24)
  })

  it('rejects ratios that do not add up to 100', () => {
    const base = preset(1)
    const invalid: GenerationPreset = {
      ...base,
      attack: { ...base.attack, ratio: [50, 49, 0] },
    }
    expect(() => parseGenerationPresets(payload([invalid]))).toThrow(TypeError)
  })

  it('rejects duplicate generations', () => {
    expect(() => parseGenerationPresets(payload([preset(1), preset(1)]))).toThrow(TypeError)
  })

  it('rejects an empty response', () => {
    expect(() => parseGenerationPresets(payload([]))).toThrow(TypeError)
  })

  it('parses the raw panel and preset buffs', () => {
    const base = preset(1)
    const withStats: GenerationPreset = {
      ...base,
      attack: {
        ...base.attack,
        rawStats: {
          infantry: [500, 400, 300, 200],
          lancer: [510, 410, 310, 210],
          marksman: [520, 420, 320, 220],
        },
        stats: {
          infantry: [700, 600, 500, 400],
          lancer: [710, 610, 510, 410],
          marksman: [720, 620, 520, 420],
        },
        modifiers: {
          city: {
            attack: 20,
            defense: 20,
            lethality: 20,
            health: 20,
            enemy_attack: 20,
            enemy_defense: 20,
          },
          pets: {
            attack: 10,
            defense: 10,
            lethality: 10,
            health: 10,
            enemy_defense: 10,
            enemy_lethality: 5,
            enemy_health: 5,
          },
          gareth: 5,
        },
      },
    }
    const parsed = parseGenerationPresets(payload([withStats]))[0]
    expect(parsed?.attack.rawStats?.infantry).toEqual([500, 400, 300, 200])
    expect(parsed?.attack.stats?.marksman).toEqual([720, 620, 520, 420])
    expect(parsed?.attack.modifiers?.city.enemy_attack).toBe(20)
    expect(parsed?.attack.modifiers?.gareth).toBe(5)
  })

  it('accepts old presets without joiners', () => {
    const legacy = {
      generation: 1,
      tier: 12,
      fc: 10,
      baseStat: 900,
      totalTroops: 1_800_000,
      attack: {
        heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'vulcanus' },
        ratio: [51, 49, 0],
      },
      defense: {
        heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'cara' },
        ratio: [43, 13, 44],
      },
    }
    expect(parseGenerationPresets(payload([legacy]))[0]?.attack.joiners).toEqual([])
    expect(parseGenerationPresets(payload([legacy]))[0]?.t12Skills).toBe(0)
  })

  it('rejects more than four joiners', () => {
    const base = preset(1)
    const invalid = {
      ...base,
      attack: {
        ...base.attack,
        joiners: ['a', 'b', 'c', 'd', 'e'],
      },
    }
    expect(() => parseGenerationPresets(payload([invalid]))).toThrow(TypeError)
  })
})
