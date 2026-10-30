import { describe, expect, it } from 'vitest'
import { composeSideStats, HERO_STAT_CONTRIBUTIONS } from './hero-stats'
import { getHeroById, HEROES } from './heroes'

function heroes(...ids: string[]) {
  return ids.flatMap((id) => {
    const hero = getHeroById(id)
    return hero ? [hero] : []
  })
}

describe('HERO_STAT_CONTRIBUTIONS', () => {
  it('covers every legendary hero', () => {
    const legendaries = HEROES.filter((hero) => hero.generation !== null)
      .map((hero) => hero.id)
      .sort()
    expect(Object.keys(HERO_STAT_CONTRIBUTIONS).sort()).toEqual(legendaries)
  })
})

describe('composeSideStats', () => {
  it('adds class stats and applies attack-side widgets', () => {
    const panel = composeSideStats(1000, heroes('seigel', 'ursar', 'eleanor'), 'left')

    expect(panel.infantry.attack).toBeCloseTo(3601.455, 3)
    expect(panel.lancer.attack).toBeCloseTo(3601.455, 3)
    expect(panel.marksman.attack).toBeCloseTo(3797.116, 3)

    expect(panel.infantry.defense).toBeCloseTo(3131.7, 3)
    expect(panel.marksman.defense).toBeCloseTo(3301.84, 3)

    expect(panel.infantry.lethality).toBeCloseTo(2107.95, 3)
    expect(panel.marksman.lethality).toBeCloseTo(2299.425, 3)

    expect(panel.infantry.health).toBeCloseTo(1833, 3)
    expect(panel.marksman.health).toBeCloseTo(1999.5, 3)
  })

  it('adds same-stat widgets and gates them by side', () => {
    const panel = composeSideStats(1000, heroes('seigel', 'bertha', 'eleanor'), 'right')

    expect(panel.infantry.lethality).toBeCloseTo(2382.9, 3)
    expect(panel.lancer.lethality).toBeCloseTo(2599.35, 3)
    expect(panel.marksman.lethality).toBeCloseTo(2599.35, 3)
    expect(panel.infantry.attack).toBeCloseTo(3131.7, 3)
    expect(panel.marksman.attack).toBeCloseTo(3301.84, 3)
  })

  it('keeps contributions class-only and only counts widgets for their side', () => {
    const left = composeSideStats(200, heroes('jeronimo', 'molly', 'zinman'), 'left')

    expect(left.infantry.attack).toBeCloseTo(529.2415, 4)
    expect(left.lancer.attack).toBeCloseTo(460.184, 4)
    expect(left.marksman.attack).toBeCloseTo(460.184, 4)
    expect(left.infantry.lethality).toBeCloseTo(262.5, 4)
    expect(left.lancer.lethality).toBeCloseTo(250, 4)
    expect(left.infantry.health).toBeCloseTo(262.5, 4)

    const right = composeSideStats(200, heroes('jeronimo', 'molly', 'zinman'), 'right')

    expect(right.infantry.attack).toBeCloseTo(529.2415, 4)
    expect(right.lancer.attack).toBeCloseTo(460.184, 4)
    expect(right.marksman.attack).toBeCloseTo(460.184, 4)
    expect(right.infantry.lethality).toBeCloseTo(301.875, 4)
    expect(right.lancer.lethality).toBeCloseTo(287.5, 4)
    expect(right.marksman.lethality).toBeCloseTo(287.5, 4)
  })
})
