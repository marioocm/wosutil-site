import { describe, expect, it } from 'vitest'
import { HERO_IMAGES } from './hero-images'
import {
  filterHeroes,
  formatHeroGeneration,
  getAllHeroes,
  getHeroById,
  getHeroesByType,
  getTroopTypeLabel,
  getTroopTypeShortLabel,
  heroInitials,
  HEROES,
  isHeroAvailable,
  TROOP_TYPES,
} from './heroes'

describe('HEROES', () => {
  it('contains every legendary and epic combat hero', () => {
    expect(HEROES).toHaveLength(61)
    expect(new Set(HEROES.map((hero) => hero.id)).size).toBe(HEROES.length)
  })

  it('splits the roster across the three troop types', () => {
    expect(getHeroesByType('infantry')).toHaveLength(19)
    expect(getHeroesByType('lancer')).toHaveLength(21)
    expect(getHeroesByType('marksman')).toHaveLength(21)
  })
})

describe('HERO_IMAGES', () => {
  it('maps every hero to an https portrait and nothing else', () => {
    expect(Object.keys(HERO_IMAGES).sort()).toEqual(HEROES.map((hero) => hero.id).sort())
    for (const image of Object.values(HERO_IMAGES)) {
      expect(image).toMatch(/^https:\/\//)
    }
  })
})

describe('TROOP_TYPES', () => {
  it('lists infantry, lancer and marksman in order', () => {
    expect(TROOP_TYPES.map((type) => type.id)).toEqual(['infantry', 'lancer', 'marksman'])
    expect(TROOP_TYPES.map((type) => type.shortLabel)).toEqual(['INF', 'LAN', 'MAR'])
    expect(getTroopTypeLabel('marksman')).toBe('Marksman')
    expect(getTroopTypeShortLabel('infantry')).toBe('INF')
  })
})

describe('getAllHeroes', () => {
  it('returns every hero sorted by generation with epics last', () => {
    const heroes = getAllHeroes()
    expect(heroes).toHaveLength(HEROES.length)
    expect(heroes.slice(0, 3).map((hero) => hero.name)).toEqual(['Aiden', 'Bertha', 'Eleanor'])
    expect(heroes.at(-1)?.generation).toBeNull()
  })
})

describe('filterHeroes', () => {
  it('filters by name ignoring case and surrounding spaces', () => {
    expect(filterHeroes(getAllHeroes(), ' natalia ').map((hero) => hero.name)).toEqual(['Natalia'])
    expect(filterHeroes(getAllHeroes(), 'MOLLY').map((hero) => hero.name)).toEqual(['Molly'])
  })

  it('returns the full sorted list for an empty query', () => {
    const all = getAllHeroes()
    expect(filterHeroes(all, '')).toEqual(all)
  })

  it('returns no results when nothing matches', () => {
    expect(filterHeroes(getAllHeroes(), 'zzzz')).toEqual([])
  })
})

describe('getHeroesByType', () => {
  it('orders heroes from newest generation to oldest, with epics last', () => {
    expect(getHeroesByType('infantry')[0]?.name).toBe('Aiden')
    expect(getHeroesByType('lancer')[0]?.name).toBe('Bertha')
    expect(getHeroesByType('marksman')[0]?.name).toBe('Eleanor')

    expect(getHeroesByType('infantry').at(-1)?.name).toBe('Sergey')
    expect(getHeroesByType('lancer').at(-1)?.name).toBe('Patrick')
    expect(getHeroesByType('marksman').at(-1)?.name).toBe('Seo-yoon')
  })

  it('keeps every result within the requested type', () => {
    for (const type of TROOP_TYPES) {
      expect(getHeroesByType(type.id).every((hero) => hero.type === type.id)).toBe(true)
    }
  })
})

describe('isHeroAvailable', () => {
  it('treats epics as always available and caps legendaries by generation', () => {
    const ahmose = getHeroById('ahmose')
    const sergey = getHeroById('sergey')
    expect(ahmose).not.toBeNull()
    expect(sergey).not.toBeNull()
    expect(isHeroAvailable(ahmose!, 3)).toBe(false)
    expect(isHeroAvailable(ahmose!, 4)).toBe(true)
    expect(isHeroAvailable(sergey!, 1)).toBe(true)
  })
})

describe('generation-capped lookups', () => {
  it('hides newer legendaries while keeping epics selectable', () => {
    const infantry = getHeroesByType('infantry', 3)
    expect(infantry.some((hero) => hero.name === 'Ahmose')).toBe(false)
    expect(infantry.some((hero) => hero.name === 'Sergey')).toBe(true)

    const all = getAllHeroes(3)
    expect(all.every((hero) => hero.generation === null || hero.generation <= 3)).toBe(true)
    expect(all.some((hero) => hero.generation === 4)).toBe(false)
  })
})

describe('formatHeroGeneration', () => {
  it('formats legendary generations and epics', () => {
    expect(formatHeroGeneration(17)).toBe('Gen 17')
    expect(formatHeroGeneration(1)).toBe('Gen 1')
    expect(formatHeroGeneration(null)).toBe('Epic')
  })
})

describe('heroInitials', () => {
  it('uses the first two letters of single-word names', () => {
    expect(heroInitials('Natalia')).toBe('NA')
    expect(heroInitials('Flint')).toBe('FL')
  })

  it('uses the initials of multi-word names', () => {
    expect(heroInitials('Wu Ming')).toBe('WM')
    expect(heroInitials('Lumak Bokan')).toBe('LB')
    expect(heroInitials('Seo-yoon')).toBe('SY')
  })

  it('handles empty names', () => {
    expect(heroInitials('   ')).toBe('?')
  })
})
