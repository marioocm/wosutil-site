import { describe, expect, it } from 'vitest'
import { getAllHeroes, getHeroById, HEROES } from './heroes'
import {
  JOINER_PACKS,
  compareJoinerHeroes,
  expandJoinerMatches,
  getJoinerPack,
  getJoinerPackMates,
  groupJoinerItems,
  joinerPackNames,
  sortJoinerHeroes,
} from './joiner-packs'

const ALL = getAllHeroes()

describe('JOINER_PACKS', () => {
  it('references known heroes exactly once', () => {
    const seen = new Set<string>()
    for (const pack of JOINER_PACKS) {
      expect(pack.members.length).toBeGreaterThanOrEqual(2)
      for (const heroId of pack.members) {
        expect(getHeroById(heroId)).not.toBeNull()
        expect(seen.has(heroId)).toBe(false)
        seen.add(heroId)
      }
    }
  })

  it('groups the epic joiner pairs with the same S1', () => {
    expect(getJoinerPack('jessie')?.members).toContain('jasser')
    expect(getJoinerPack('jasser')?.members).toContain('jessie')
    expect(getJoinerPack('sergey')?.members).toContain('bahiti')
    expect(getJoinerPack('bahiti')?.members).toContain('sergey')
  })

  it('keeps hero-specific S1s out of the packs', () => {
    expect(getJoinerPack('flint')).toBeNull()
    expect(getJoinerPack('renee')).toBeNull()
    expect(getJoinerPack('gwen')).toBeNull()
  })

  it('lists epics first and then legendaries from oldest to newest', () => {
    for (const pack of JOINER_PACKS) {
      const heroes = pack.members.map((heroId) => getHeroById(heroId)!)
      const firstLegendary = heroes.findIndex((hero) => hero.generation !== null)
      const legendaries = firstLegendary === -1 ? [] : heroes.slice(firstLegendary)
      expect(legendaries.every((hero) => hero.generation !== null)).toBe(true)
      const generations = legendaries.map((hero) => hero.generation!)
      expect(generations).toEqual([...generations].sort((left, right) => left - right))
    }
  })

  it('lists the other members of one pack', () => {
    expect(getJoinerPackMates('jessie').map((hero) => hero.id)).toEqual([
      'jasser',
      'jeronimo',
      'blanchette',
      'hervor',
      'hank',
      'bertha',
    ])
    expect(joinerPackNames(getJoinerPack('sergey')!)).toEqual([
      'Sergey',
      'Bahiti',
      'Xura',
      'Karol',
    ])
  })
})

describe('sortJoinerHeroes', () => {
  it('puts epics first and then generations from oldest to newest', () => {
    const heroes = sortJoinerHeroes(ALL)
    const firstLegendary = heroes.findIndex((hero) => hero.generation !== null)
    expect(heroes.slice(0, firstLegendary).every((hero) => hero.generation === null)).toBe(true)
    const legendaries = heroes.slice(firstLegendary)
    const generations = legendaries.map((hero) => hero.generation ?? 0)
    expect(generations).toEqual([...generations].sort((left, right) => left - right))
    expect(heroes[0]?.name).toBe('Bahiti')
  })

  it('sorts same-generation legendaries by name', () => {
    const older = { name: 'Zed', generation: 1 }
    const newer = { name: 'Amy', generation: 2 }
    const epic = { name: 'Mia', generation: null }
    expect([newer, epic, older].sort(compareJoinerHeroes).map((hero) => hero.name)).toEqual([
      'Mia',
      'Zed',
      'Amy',
    ])
  })
})

describe('groupJoinerItems', () => {
  it('puts every equivalent hero in one group, keeping the pack order', () => {
    const groups = groupJoinerItems(ALL, (hero) => hero.id)
    const jessie = groups.find((group) => group.pack?.id === 'jessie-s1')
    expect(jessie?.items.map((hero) => hero.id)).toEqual([
      'jessie',
      'jasser',
      'jeronimo',
      'blanchette',
      'hervor',
      'hank',
      'bertha',
    ])
  })

  it('uses the first member position for the group and leaves singles alone', () => {
    const groups = groupJoinerItems(ALL, (hero) => hero.id)
    const first = groups.find((group) => group.pack?.id === 'jessie-s1')
    expect(first?.items[0]?.name).toBe('Jessie')
    expect(groups.some((group) => group.pack === null && group.items[0]?.id === 'flint')).toBe(
      true,
    )
  })

  it('skips a pack that only has one available member', () => {
    const onlyJessie = ALL.filter((hero) => hero.id === 'jessie')
    const groups = groupJoinerItems(onlyJessie, (hero) => hero.id)
    expect(groups).toEqual([{ pack: null, items: [getHeroById('jessie')] }])
  })
})

describe('expandJoinerMatches', () => {
  it('shows the whole pack when any member matches a search', () => {
    const matching = ALL.filter((hero) => hero.id === 'bertha')
    const expanded = expandJoinerMatches(ALL, matching, (hero) => hero.id)
    expect(expanded.map((hero) => hero.id)).toEqual(
      expect.arrayContaining(['jessie', 'jasser', 'bertha']),
    )
  })

  it('keeps non-pack matches untouched', () => {
    const matching = ALL.filter((hero) => hero.id === 'flint')
    const expanded = expandJoinerMatches(ALL, matching, (hero) => hero.id)
    expect(expanded.map((hero) => hero.id)).toEqual(['flint'])
  })
})

describe('roster coverage', () => {
  it('only packs known heroes from the roster', () => {
    const packed = new Set(JOINER_PACKS.flatMap((pack) => pack.members))
    expect([...packed].every((id) => HEROES.some((hero) => hero.id === id))).toBe(true)
  })
})
