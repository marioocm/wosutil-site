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
      ratio: [55, 15, 30],
    },
    defense: {
      heroes: { infantry: 'jeronimo', lancer: 'molly', marksman: 'zinman' },
      ratio: [46, 18, 36],
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
      ratio: [49, 19, 32],
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
      ratio: [45, 15, 40],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'philly', marksman: 'greg' },
      ratio: [56, 12, 32],
    },
  },
  {
    generation: 4,
    tier: 10,
    fc: 5,
    baseStat: 350,
    totalTroops: 1_250_000,
    attack: {
      heroes: { infantry: 'jeronimo', lancer: 'mia', marksman: 'lynn' },
      ratio: [60, 7, 33],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'philly', marksman: 'lynn' },
      ratio: [50, 8, 42],
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
      ratio: [50, 10, 40],
    },
    defense: {
      heroes: { infantry: 'logan', lancer: 'norah', marksman: 'lynn' },
      ratio: [40, 26, 34],
    },
  },
  {
    generation: 6,
    tier: 11,
    fc: 10,
    baseStat: 450,
    totalTroops: 1_350_000,
    attack: {
      heroes: { infantry: 'wu-ming', lancer: 'mia', marksman: 'wayne' },
      ratio: [54, 0, 46],
    },
    defense: {
      heroes: { infantry: 'wu-ming', lancer: 'molly', marksman: 'wayne' },
      ratio: [35, 0, 65],
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
      ratio: [44, 9, 47],
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
      ratio: [36, 4, 60],
    },
    defense: {
      heroes: { infantry: 'gatot', lancer: 'sonya', marksman: 'zinman' },
      ratio: [50, 50, 0],
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
      ratio: [62, 3, 35],
    },
    defense: {
      heroes: { infantry: 'magnus', lancer: 'molly', marksman: 'xura' },
      ratio: [46, 0, 54],
    },
  },
  {
    generation: 10,
    tier: 12,
    fc: 10,
    baseStat: 650,
    totalTroops: 1_550_000,
    attack: {
      heroes: { infantry: 'gregory', lancer: 'fred', marksman: 'blanchette' },
      ratio: [38, 20, 42],
    },
    defense: {
      heroes: { infantry: 'gregory', lancer: 'freya', marksman: 'blanchette' },
      ratio: [44, 23, 33],
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
      ratio: [60, 13, 27],
    },
    defense: {
      heroes: { infantry: 'eleonora', lancer: 'molly', marksman: 'rufus' },
      ratio: [58, 2, 40],
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
      ratio: [57, 23, 20],
    },
    defense: {
      heroes: { infantry: 'hervor', lancer: 'karol', marksman: 'ligeia' },
      ratio: [61, 2, 37],
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
      ratio: [62, 13, 25],
    },
    defense: {
      heroes: { infantry: 'gisela', lancer: 'flora', marksman: 'vulcanus' },
      ratio: [57, 8, 35],
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
      ratio: [47, 19, 34],
    },
    defense: {
      heroes: { infantry: 'elif', lancer: 'flora', marksman: 'cara' },
      ratio: [52, 6, 42],
    },
  },
  {
    generation: 15,
    tier: 12,
    fc: 10,
    baseStat: 900,
    totalTroops: 1_800_000,
    attack: {
      heroes: { infantry: 'elif', lancer: 'dominic', marksman: 'cara' },
      ratio: [34, 26, 40],
    },
    defense: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'cara' },
      ratio: [43, 14, 43],
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
      ratio: [34, 21, 45],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'ursar', marksman: 'aisling' },
      ratio: [34, 17, 49],
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
      ratio: [46, 41, 13],
    },
    defense: {
      heroes: { infantry: 'seigel', lancer: 'estrella', marksman: 'eleanor' },
      ratio: [61, 2, 37],
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
