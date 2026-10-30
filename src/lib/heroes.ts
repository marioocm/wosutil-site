export type TroopType = 'infantry' | 'lancer' | 'marksman'

export interface Hero {
  id: string
  name: string
  type: TroopType
  generation: number | null
}

export interface TroopTypeOption {
  id: TroopType
  label: string
  shortLabel: string
}

export const TROOP_TYPES: readonly TroopTypeOption[] = [
  { id: 'infantry', label: 'Infantry', shortLabel: 'INF' },
  { id: 'lancer', label: 'Lancer', shortLabel: 'LAN' },
  { id: 'marksman', label: 'Marksman', shortLabel: 'MAR' },
]

export const HEROES: readonly Hero[] = [
  { id: 'natalia', name: 'Natalia', type: 'infantry', generation: 1 },
  { id: 'jeronimo', name: 'Jeronimo', type: 'infantry', generation: 1 },
  { id: 'molly', name: 'Molly', type: 'lancer', generation: 1 },
  { id: 'zinman', name: 'Zinman', type: 'marksman', generation: 1 },
  { id: 'flint', name: 'Flint', type: 'infantry', generation: 2 },
  { id: 'philly', name: 'Philly', type: 'lancer', generation: 2 },
  { id: 'alonso', name: 'Alonso', type: 'marksman', generation: 2 },
  { id: 'logan', name: 'Logan', type: 'infantry', generation: 3 },
  { id: 'mia', name: 'Mia', type: 'lancer', generation: 3 },
  { id: 'greg', name: 'Greg', type: 'marksman', generation: 3 },
  { id: 'ahmose', name: 'Ahmose', type: 'infantry', generation: 4 },
  { id: 'reina', name: 'Reina', type: 'lancer', generation: 4 },
  { id: 'lynn', name: 'Lynn', type: 'marksman', generation: 4 },
  { id: 'hector', name: 'Hector', type: 'infantry', generation: 5 },
  { id: 'norah', name: 'Norah', type: 'lancer', generation: 5 },
  { id: 'gwen', name: 'Gwen', type: 'marksman', generation: 5 },
  { id: 'wu-ming', name: 'Wu Ming', type: 'infantry', generation: 6 },
  { id: 'renee', name: 'Renee', type: 'lancer', generation: 6 },
  { id: 'wayne', name: 'Wayne', type: 'marksman', generation: 6 },
  { id: 'edith', name: 'Edith', type: 'infantry', generation: 7 },
  { id: 'gordon', name: 'Gordon', type: 'lancer', generation: 7 },
  { id: 'bradley', name: 'Bradley', type: 'marksman', generation: 7 },
  { id: 'gatot', name: 'Gatot', type: 'infantry', generation: 8 },
  { id: 'sonya', name: 'Sonya', type: 'lancer', generation: 8 },
  { id: 'hendrik', name: 'Hendrik', type: 'marksman', generation: 8 },
  { id: 'magnus', name: 'Magnus', type: 'infantry', generation: 9 },
  { id: 'fred', name: 'Fred', type: 'lancer', generation: 9 },
  { id: 'xura', name: 'Xura', type: 'marksman', generation: 9 },
  { id: 'gregory', name: 'Gregory', type: 'infantry', generation: 10 },
  { id: 'freya', name: 'Freya', type: 'lancer', generation: 10 },
  { id: 'blanchette', name: 'Blanchette', type: 'marksman', generation: 10 },
  { id: 'eleonora', name: 'Eleonora', type: 'infantry', generation: 11 },
  { id: 'lloyd', name: 'Lloyd', type: 'lancer', generation: 11 },
  { id: 'rufus', name: 'Rufus', type: 'marksman', generation: 11 },
  { id: 'hervor', name: 'Hervor', type: 'infantry', generation: 12 },
  { id: 'karol', name: 'Karol', type: 'lancer', generation: 12 },
  { id: 'ligeia', name: 'Ligeia', type: 'marksman', generation: 12 },
  { id: 'gisela', name: 'Gisela', type: 'infantry', generation: 13 },
  { id: 'flora', name: 'Flora', type: 'lancer', generation: 13 },
  { id: 'vulcanus', name: 'Vulcanus', type: 'marksman', generation: 13 },
  { id: 'elif', name: 'Elif', type: 'infantry', generation: 14 },
  { id: 'dominic', name: 'Dominic', type: 'lancer', generation: 14 },
  { id: 'cara', name: 'Cara', type: 'marksman', generation: 14 },
  { id: 'hank', name: 'Hank', type: 'infantry', generation: 15 },
  { id: 'estrella', name: 'Estrella', type: 'lancer', generation: 15 },
  { id: 'viveca', name: 'Viveca', type: 'marksman', generation: 15 },
  { id: 'seigel', name: 'Seigel', type: 'infantry', generation: 16 },
  { id: 'ursar', name: 'Ursar', type: 'lancer', generation: 16 },
  { id: 'aisling', name: 'Aisling', type: 'marksman', generation: 16 },
  { id: 'aiden', name: 'Aiden', type: 'infantry', generation: 17 },
  { id: 'bertha', name: 'Bertha', type: 'lancer', generation: 17 },
  { id: 'eleanor', name: 'Eleanor', type: 'marksman', generation: 17 },
  { id: 'sergey', name: 'Sergey', type: 'infantry', generation: null },
  { id: 'patrick', name: 'Patrick', type: 'lancer', generation: null },
  { id: 'jessie', name: 'Jessie', type: 'lancer', generation: null },
  { id: 'lumak-bokan', name: 'Lumak Bokan', type: 'lancer', generation: null },
  { id: 'ling-xue', name: 'Ling Xue', type: 'lancer', generation: null },
  { id: 'bahiti', name: 'Bahiti', type: 'marksman', generation: null },
  { id: 'gina', name: 'Gina', type: 'marksman', generation: null },
  { id: 'seo-yoon', name: 'Seo-yoon', type: 'marksman', generation: null },
  { id: 'jasser', name: 'Jasser', type: 'marksman', generation: null },
]

export function getTroopTypeLabel(type: TroopType): string {
  return TROOP_TYPES.find((item) => item.id === type)?.label ?? type
}

export function getHeroesByType(type: TroopType): Hero[] {
  return HEROES.filter((hero) => hero.type === type).sort((a, b) => {
    const aGeneration = a.generation ?? 0
    const bGeneration = b.generation ?? 0
    if (aGeneration !== bGeneration) return bGeneration - aGeneration
    return a.name.localeCompare(b.name)
  })
}

export function formatHeroGeneration(generation: number | null): string {
  return generation === null ? 'Epic' : `Gen ${generation}`
}

export function heroInitials(name: string): string {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0] ?? ''
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const second = parts[1] ?? ''
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
}
