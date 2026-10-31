import type { TroopType } from './heroes'

export interface GenerationLineup {
  heroes: Record<TroopType, string>
  ratio: readonly [number, number, number]
}

export interface GenerationPreset {
  generation: number
  tier: number
  fc: number
  baseStat: number
  totalTroops: number
  attack: GenerationLineup
  defense: GenerationLineup
}

export interface GenerationChangeDetail {
  generation: number
}

export const GENERATION_CHANGE_EVENT = 'wosutil:generation-change'

export const GENERATIONS: readonly GenerationPreset[] = [
  {
    generation: 1,
    tier: 10,
    fc: 0,
    baseStat: 200,
    totalTroops: 800_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'molly', marksman: 'zinman' },
      ratio: [51, 15, 34],
    },
    defense: {
      heroes: { infantry: 'jeronimo', lancer: 'molly', marksman: 'zinman' },
      ratio: [46, 21, 33],
    },
  },
  {
    generation: 2,
    tier: 10,
    fc: 0,
    baseStat: 250,
    totalTroops: 900_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'philly', marksman: 'alonso' },
      ratio: [50, 20, 30],
    },
    defense: {
      heroes: { infantry: 'flint', lancer: 'philly', marksman: 'zinman' },
      ratio: [53, 20, 27],
    },
  },
  {
    generation: 3,
    tier: 10,
    fc: 0,
    baseStat: 300,
    totalTroops: 1_000_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'mia', marksman: 'greg' },
      ratio: [51, 16, 33],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'philly', marksman: 'greg' },
      ratio: [55, 15, 30],
    },
  },
  {
    generation: 4,
    tier: 10,
    fc: 5,
    baseStat: 350,
    totalTroops: 1_250_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'reina', marksman: 'greg' },
      ratio: [51, 37, 12],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'philly', marksman: 'lynn' },
      ratio: [50, 7, 43],
    },
  },
  {
    generation: 5,
    tier: 11,
    fc: 8,
    baseStat: 400,
    totalTroops: 1_300_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'mia', marksman: 'gwen' },
      ratio: [45, 10, 45],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'norah', marksman: 'lynn' },
      ratio: [42, 25, 33],
    },
  },
  {
    generation: 6,
    tier: 11,
    fc: 10,
    baseStat: 450,
    totalTroops: 1_350_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'renee', marksman: 'greg' },
      ratio: [40, 57, 3],
    },
    defense: {
      heroes: { infantry: 'wu-ming', lancer: 'philly', marksman: 'wayne' },
      ratio: [42, 2, 56],
    },
  },
  {
    generation: 7,
    tier: 11,
    fc: 10,
    baseStat: 500,
    totalTroops: 1_400_000,
    attack: {
      heroes: { infantry: 'edith', lancer: 'mia', marksman: 'bradley' },
      ratio: [51, 7, 42],
    },
    defense: {
      heroes: { infantry: 'edith', lancer: 'gordon', marksman: 'bradley' },
      ratio: [59, 38, 3],
    },
  },
  {
    generation: 8,
    tier: 11,
    fc: 10,
    baseStat: 550,
    totalTroops: 1_450_000,
    attack: {
      heroes: { infantry: 'gatot', lancer: 'mia', marksman: 'hendrik' },
      ratio: [33, 1, 66],
    },
    defense: {
      heroes: { infantry: 'gatot', lancer: 'sonya', marksman: 'zinman' },
      ratio: [55, 45, 0],
    },
  },
  {
    generation: 9,
    tier: 11,
    fc: 10,
    baseStat: 600,
    totalTroops: 1_500_000,
    attack: {
      heroes: { infantry: 'magnus', lancer: 'fred', marksman: 'hendrik' },
      ratio: [61, 20, 19],
    },
    defense: {
      heroes: { infantry: 'magnus', lancer: 'molly', marksman: 'xura' },
      ratio: [43, 1, 56],
    },
  },
  {
    generation: 10,
    tier: 12,
    fc: 10,
    baseStat: 650,
    totalTroops: 1_550_000,
    attack: {
      heroes: { infantry: 'gregory', lancer: 'mia', marksman: 'blanchette' },
      ratio: [44, 1, 55],
    },
    defense: {
      heroes: { infantry: 'gregory', lancer: 'freya', marksman: 'blanchette' },
      ratio: [47, 21, 32],
    },
  },
  {
    generation: 11,
    tier: 12,
    fc: 10,
    baseStat: 700,
    totalTroops: 1_600_000,
    attack: {
      heroes: { infantry: 'eleonora', lancer: 'mia', marksman: 'rufus' },
      ratio: [66, 2, 32],
    },
    defense: {
      heroes: { infantry: 'eleonora', lancer: 'mia', marksman: 'rufus' },
      ratio: [64, 1, 35],
    },
  },
  {
    generation: 12,
    tier: 12,
    fc: 10,
    baseStat: 750,
    totalTroops: 1_650_000,
    attack: {
      heroes: { infantry: 'hervor', lancer: 'karol', marksman: 'hendrik' },
      ratio: [56, 22, 22],
    },
    defense: {
      heroes: { infantry: 'hervor', lancer: 'karol', marksman: 'ligeia' },
      ratio: [60, 3, 37],
    },
  },
  {
    generation: 13,
    tier: 12,
    fc: 10,
    baseStat: 800,
    totalTroops: 1_700_000,
    attack: {
      heroes: { infantry: 'gisela', lancer: 'flora', marksman: 'vulcanus' },
      ratio: [58, 7, 35],
    },
    defense: {
      heroes: { infantry: 'gisela', lancer: 'flora', marksman: 'vulcanus' },
      ratio: [57, 7, 36],
    },
  },
  {
    generation: 14,
    tier: 12,
    fc: 10,
    baseStat: 850,
    totalTroops: 1_750_000,
    attack: {
      heroes: { infantry: 'elif', lancer: 'dominic', marksman: 'vulcanus' },
      ratio: [43, 19, 38],
    },
    defense: {
      heroes: { infantry: 'elif', lancer: 'flora', marksman: 'cara' },
      ratio: [54, 4, 42],
    },
  },
  {
    generation: 15,
    tier: 12,
    fc: 10,
    baseStat: 900,
    totalTroops: 1_800_000,
    attack: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'vulcanus' },
      ratio: [51, 47, 2],
    },
    defense: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'cara' },
      ratio: [44, 13, 43],
    },
  },
  {
    generation: 16,
    tier: 12,
    fc: 10,
    baseStat: 950,
    totalTroops: 1_850_000,
    attack: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'rufus' },
      ratio: [49, 49, 2],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'aisling' },
      ratio: [36, 14, 50],
    },
  },
  {
    generation: 17,
    tier: 12,
    fc: 10,
    baseStat: 1000,
    totalTroops: 1_900_000,
    attack: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'viveca' },
      ratio: [51, 45, 4],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'flora', marksman: 'eleanor' },
      ratio: [60, 1, 39],
    },
  },
]

export const MIN_GENERATION = GENERATIONS[0]?.generation ?? 1
export const MAX_GENERATION = GENERATIONS.at(-1)?.generation ?? 1

export function getGenerationPreset(generation: number): GenerationPreset | null {
  return GENERATIONS.find((preset) => preset.generation === generation) ?? null
}

export function getGenerationLineup(
  preset: GenerationPreset,
  side: 'left' | 'right',
): GenerationLineup {
  return side === 'left' ? preset.attack : preset.defense
}

export function dispatchGenerationChange(generation: number): void {
  document.dispatchEvent(
    new CustomEvent<GenerationChangeDetail>(GENERATION_CHANGE_EVENT, {
      detail: { generation },
    }),
  )
}

export function onGenerationChange(listener: (generation: number) => void): void {
  document.addEventListener(GENERATION_CHANGE_EVENT, (event) => {
    const detail = (event as CustomEvent<GenerationChangeDetail>).detail
    if (!detail || !Number.isInteger(detail.generation)) return
    listener(detail.generation)
  })
}
