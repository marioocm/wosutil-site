// Joiners only apply their S1 skill, so heroes whose S1 belongs to the same
// engine equivalence class are interchangeable. The groups below mirror
// `wosutil-sim`'s `SKILL_CLASSES` (docs/SKILLS_TABLE.md), keeping only S1
// members and only classes with at least two heroes.
import { getHeroById, type Hero } from './heroes'

export interface JoinerPack {
  /** Stable id derived from the engine equivalence class name. */
  id: string
  /** Short description of the shared S1 effect. */
  effect: string
  /** Member ids, with epics first and then oldest generation first. */
  members: readonly string[]
}

export const JOINER_PACKS: readonly JoinerPack[] = [
  {
    id: 'jessie-s1',
    effect: '+25% Lethality',
    members: ['jessie', 'jasser', 'jeronimo', 'blanchette', 'hervor', 'hank', 'bertha'],
  },
  {
    id: 'seoyoon-s1',
    effect: '+25% Attack',
    members: ['seo-yoon', 'bradley', 'magnus', 'rufus', 'viveca'],
  },
  {
    id: 'sergey-s1',
    effect: '-20% Damage taken',
    members: ['sergey', 'bahiti', 'xura', 'karol'],
  },
  {
    id: 'patrick-s1',
    effect: '+25% Health',
    members: ['patrick', 'eleonora', 'seigel'],
  },
  {
    id: 'lumak-bokan-s1',
    effect: '-20% Enemy lethality',
    members: ['lumak-bokan', 'fred', 'lloyd', 'cara'],
  },
  {
    id: 'ling-xue-s1',
    effect: '-20% Enemy attack',
    members: ['ling-xue', 'logan', 'freya', 'vulcanus'],
  },
  {
    id: 'molly-s1',
    effect: '-50% Damage taken',
    members: ['molly', 'natalia', 'hector'],
  },
  {
    id: 'gatot-s1',
    effect: '+30% Defense',
    members: ['gatot', 'gisela'],
  },
  {
    id: 'gatot-s3',
    effect: '-25% Enemy attack',
    members: ['elif', 'ursar'],
  },
  {
    id: 'hendrik-s1',
    effect: '-25% Enemy defense',
    members: ['hendrik', 'ligeia', 'estrella', 'eleanor'],
  },
  {
    id: 'alonso-s1',
    effect: '+50% Lethality',
    members: ['alonso', 'lynn'],
  },
  {
    id: 'mia-s1',
    effect: '+50% Target damage taken',
    members: ['mia', 'flora'],
  },
  {
    id: 'philly-s1',
    effect: '+15% Attack, +10% Defense',
    members: ['philly', 'gregory'],
  },
  {
    id: 'wu-ming-s2',
    effect: '+20% Damage dealt',
    members: ['sonya', 'dominic', 'aisling'],
  },
]

const PACK_BY_HERO = new Map<string, JoinerPack>()
for (const pack of JOINER_PACKS) {
  for (const heroId of pack.members) PACK_BY_HERO.set(heroId, pack)
}

export function getJoinerPack(heroId: string): JoinerPack | null {
  return PACK_BY_HERO.get(heroId) ?? null
}

/** Every other hero that shares the selected hero's S1. */
export function getJoinerPackMates(heroId: string): Hero[] {
  const pack = getJoinerPack(heroId)
  if (!pack) return []
  return pack.members
    .filter((memberId) => memberId !== heroId)
    .flatMap((memberId) => {
      const hero = getHeroById(memberId)
      return hero ? [hero] : []
    })
}

/** Display names for one pack, in the pack's canonical order. */
export function joinerPackNames(pack: JoinerPack): string[] {
  return pack.members.flatMap((memberId) => {
    const hero = getHeroById(memberId)
    return hero ? [hero.name] : []
  })
}

export type JoinerSortable = Pick<Hero, 'generation' | 'name'>

/** Epics first, then legendaries from oldest to newest generation. */
export function compareJoinerHeroes(left: JoinerSortable, right: JoinerSortable): number {
  const leftEpic = left.generation === null
  const rightEpic = right.generation === null
  if (leftEpic !== rightEpic) return leftEpic ? -1 : 1
  if (!leftEpic && !rightEpic) {
    const generation = (left.generation ?? 0) - (right.generation ?? 0)
    if (generation !== 0) return generation
  }
  return left.name.localeCompare(right.name)
}

export function sortJoinerHeroes<T extends JoinerSortable>(heroes: readonly T[]): T[] {
  return [...heroes].sort(compareJoinerHeroes)
}

export interface JoinerGroup<T> {
  /** Null when the group has a single member after filtering. */
  pack: JoinerPack | null
  items: T[]
}

/**
 * Groups a generation-sorted list by S1 equivalence. The group takes the
 * position of its first member, and members keep the pack's canonical order.
 */
export function groupJoinerItems<T>(
  items: readonly T[],
  heroId: (item: T) => string,
): JoinerGroup<T>[] {
  const groups: JoinerGroup<T>[] = []
  const byPack = new Map<string, JoinerGroup<T> & { pack: JoinerPack }>()

  for (const item of items) {
    const pack = getJoinerPack(heroId(item))
    if (!pack) {
      groups.push({ pack: null, items: [item] })
      continue
    }
    const existing = byPack.get(pack.id)
    if (existing) {
      existing.items.push(item)
      continue
    }
    const group: JoinerGroup<T> & { pack: JoinerPack } = { pack, items: [item] }
    byPack.set(pack.id, group)
    groups.push(group)
  }

  return groups.map((group) => {
    if (!group.pack || group.items.length < 2) return { pack: null, items: group.items }

    const order = new Map(group.pack.members.map((id, index) => [id, index]))
    group.items.sort(
      (left, right) =>
        (order.get(heroId(left)) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(heroId(right)) ?? Number.MAX_SAFE_INTEGER),
    )
    return group
  })
}

/**
 * Keeps the full pack when one of its members matches a search.
 * `all` preserves the picker order; `matching` only decides which packs show.
 */
export function expandJoinerMatches<T>(
  all: readonly T[],
  matching: readonly T[],
  heroId: (item: T) => string,
): T[] {
  const matchingIds = new Set<string>()
  const matchingPacks = new Set<string>()
  for (const item of matching) {
    const id = heroId(item)
    matchingIds.add(id)
    const pack = getJoinerPack(id)
    if (pack) matchingPacks.add(pack.id)
  }

  return all.filter((item) => {
    const id = heroId(item)
    if (matchingIds.has(id)) return true
    const pack = getJoinerPack(id)
    return pack !== null && matchingPacks.has(pack.id)
  })
}
