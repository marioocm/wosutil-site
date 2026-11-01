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
      ratio: [56, 21, 23],
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
    totalTroops: 900_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'philly', marksman: 'alonso' },
      ratio: [54, 15, 31],
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
    totalTroops: 1_000_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'mia', marksman: 'greg' },
      ratio: [56, 15, 29],
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
      heroes: { infantry: 'jeronimo', lancer: 'reina', marksman: 'greg' },
      ratio: [52, 36, 12],
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
      ratio: [45, 11, 44],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'norah', marksman: 'lynn' },
      ratio: [43, 28, 29],
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
      ratio: [44, 55, 1],
    },
    defense: {
      heroes: { infantry: 'wu-ming', lancer: 'philly', marksman: 'wayne' },
      ratio: [41, 3, 56],
    },
  },
  {
    generation: 7,
    tier: 11,
    fc: 10,
    baseStat: 500,
    totalTroops: 1_400_000,
    attack: {
      heroes: { infantry: 'edith', lancer: 'renee', marksman: 'bradley' },
      ratio: [50, 23, 27],
    },
    defense: {
      heroes: { infantry: 'edith', lancer: 'gordon', marksman: 'bradley' },
      ratio: [59, 40, 1],
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
      ratio: [35, 2, 63],
    },
    defense: {
      heroes: { infantry: 'gatot', lancer: 'sonya', marksman: 'zinman' },
      ratio: [54, 46, 0],
    },
  },
  {
    generation: 9,
    tier: 11,
    fc: 10,
    baseStat: 600,
    totalTroops: 1_500_000,
    attack: {
      heroes: { infantry: 'magnus', lancer: 'mia', marksman: 'xura' },
      ratio: [64, 1, 35],
    },
    defense: {
      heroes: { infantry: 'magnus', lancer: 'molly', marksman: 'xura' },
      ratio: [44, 1, 55],
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
      ratio: [50, 1, 49],
    },
    defense: {
      heroes: { infantry: 'gregory', lancer: 'freya', marksman: 'blanchette' },
      ratio: [46, 19, 35],
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
      ratio: [65, 1, 34],
    },
    defense: {
      heroes: { infantry: 'eleonora', lancer: 'molly', marksman: 'rufus' },
      ratio: [63, 1, 36],
    },
  },
  {
    generation: 12,
    tier: 12,
    fc: 10,
    baseStat: 750,
    totalTroops: 1_650_000,
    attack: {
      heroes: { infantry: 'hervor', lancer: 'mia', marksman: 'rufus' },
      ratio: [64, 1, 35],
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
      ratio: [60, 7, 33],
    },
    defense: {
      heroes: { infantry: 'gisela', lancer: 'flora', marksman: 'vulcanus' },
      ratio: [62, 7, 31],
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
      ratio: [47, 20, 33],
    },
    defense: {
      heroes: { infantry: 'elif', lancer: 'flora', marksman: 'cara' },
      ratio: [54, 6, 40],
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
      ratio: [51, 49, 0],
    },
    defense: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'cara' },
      ratio: [43, 13, 44],
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
      ratio: [37, 17, 46],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'aisling' },
      ratio: [39, 10, 51],
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
      ratio: [59, 8, 33],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'flora', marksman: 'eleanor' },
      ratio: [59, 1, 40],
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
