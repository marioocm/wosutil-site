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
    totalTroops: 300_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'molly', marksman: 'zinman' },
      ratio: [56, 15, 29],
    },
    defense: {
      heroes: { infantry: 'jeronimo', lancer: 'molly', marksman: 'zinman' },
      ratio: [54, 13, 33],
    },
  },
  {
    generation: 2,
    tier: 10,
    fc: 0,
    baseStat: 250,
    totalTroops: 500_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'philly', marksman: 'alonso' },
      ratio: [40, 30, 30],
    },
    defense: {
      heroes: { infantry: 'flint', lancer: 'philly', marksman: 'zinman' },
      ratio: [53, 21, 26],
    },
  },
  {
    generation: 3,
    tier: 10,
    fc: 0,
    baseStat: 300,
    totalTroops: 800_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'mia', marksman: 'greg' },
      ratio: [57, 12, 31],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'mia', marksman: 'greg' },
      ratio: [55, 17, 28],
    },
  },
  {
    generation: 4,
    tier: 10,
    fc: 5,
    baseStat: 350,
    totalTroops: 1_250_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'mia', marksman: 'greg' },
      ratio: [45, 19, 36],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'molly', marksman: 'lynn' },
      ratio: [42, 12, 46],
    },
  },
  {
    generation: 5,
    tier: 11,
    fc: 8,
    baseStat: 400,
    totalTroops: 1_300_000,
    attack: {
      heroes: { infantry: 'logan', lancer: 'norah', marksman: 'greg' },
      ratio: [42, 43, 15],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'norah', marksman: 'zinman' },
      ratio: [40, 50, 10],
    },
  },
  {
    generation: 6,
    tier: 11,
    fc: 10,
    baseStat: 450,
    totalTroops: 1_350_000,
    attack: {
      heroes: { infantry: 'wu-ming', lancer: 'renee', marksman: 'greg' },
      ratio: [58, 37, 5],
    },
    defense: {
      heroes: { infantry: 'wu-ming', lancer: 'norah', marksman: 'wayne' },
      ratio: [34, 25, 41],
    },
  },
  {
    generation: 7,
    tier: 11,
    fc: 10,
    baseStat: 500,
    totalTroops: 1_400_000,
    attack: {
      heroes: { infantry: 'edith', lancer: 'gordon', marksman: 'bradley' },
      ratio: [52, 29, 19],
    },
    defense: {
      heroes: { infantry: 'edith', lancer: 'norah', marksman: 'bradley' },
      ratio: [52, 16, 32],
    },
  },
  {
    generation: 8,
    tier: 11,
    fc: 10,
    baseStat: 550,
    totalTroops: 1_450_000,
    attack: {
      heroes: { infantry: 'edith', lancer: 'gordon', marksman: 'hendrik' },
      ratio: [45, 20, 35],
    },
    defense: {
      heroes: { infantry: 'gatot', lancer: 'sonya', marksman: 'bradley' },
      ratio: [42, 51, 7],
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
      ratio: [49, 15, 36],
    },
    defense: {
      heroes: { infantry: 'magnus', lancer: 'fred', marksman: 'xura' },
      ratio: [49, 13, 38],
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
      ratio: [50, 5, 45],
    },
    defense: {
      heroes: { infantry: 'gregory', lancer: 'freya', marksman: 'xura' },
      ratio: [38, 19, 43],
    },
  },
  {
    generation: 11,
    tier: 12,
    fc: 10,
    baseStat: 700,
    totalTroops: 1_600_000,
    attack: {
      heroes: { infantry: 'eleonora', lancer: 'fred', marksman: 'rufus' },
      ratio: [53, 9, 38],
    },
    defense: {
      heroes: { infantry: 'eleonora', lancer: 'freya', marksman: 'rufus' },
      ratio: [47, 7, 46],
    },
  },
  {
    generation: 12,
    tier: 12,
    fc: 10,
    baseStat: 750,
    totalTroops: 1_650_000,
    attack: {
      heroes: { infantry: 'hervor', lancer: 'karol', marksman: 'rufus' },
      ratio: [57, 12, 31],
    },
    defense: {
      heroes: { infantry: 'hervor', lancer: 'freya', marksman: 'ligeia' },
      ratio: [48, 8, 44],
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
      ratio: [55, 10, 35],
    },
    defense: {
      heroes: { infantry: 'gisela', lancer: 'flora', marksman: 'vulcanus' },
      ratio: [54, 11, 35],
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
      ratio: [43, 18, 39],
    },
    defense: {
      heroes: { infantry: 'elif', lancer: 'dominic', marksman: 'cara' },
      ratio: [36, 22, 42],
    },
  },
  {
    generation: 15,
    tier: 12,
    fc: 10,
    baseStat: 900,
    totalTroops: 1_800_000,
    attack: {
      heroes: { infantry: 'hank', lancer: 'dominic', marksman: 'vulcanus' },
      ratio: [44, 17, 39],
    },
    defense: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'cara' },
      ratio: [46, 47, 7],
    },
  },
  {
    generation: 16,
    tier: 12,
    fc: 10,
    baseStat: 950,
    totalTroops: 1_850_000,
    attack: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'viveca' },
      ratio: [57, 35, 8],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'cara' },
      ratio: [30, 27, 43],
    },
  },
  {
    generation: 17,
    tier: 12,
    fc: 10,
    baseStat: 1000,
    totalTroops: 1_900_000,
    attack: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'eleanor' },
      ratio: [42, 12, 46],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'bertha', marksman: 'eleanor' },
      ratio: [38, 18, 44],
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
