import { describe, expect, it } from 'vitest'
import {
  formatHeroGeneration,
  getHeroesByType,
  getTroopTypeLabel,
  heroInitials,
  HEROES,
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

describe('TROOP_TYPES', () => {
  it('lists infantry, lancer and marksman in order', () => {
    expect(TROOP_TYPES.map((type) => type.id)).toEqual(['infantry', 'lancer', 'marksman'])
    expect(TROOP_TYPES.map((type) => type.shortLabel)).toEqual(['INF', 'LAN', 'MAR'])
    expect(getTroopTypeLabel('marksman')).toBe('Marksman')
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
