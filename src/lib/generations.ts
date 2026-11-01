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

let presets: readonly GenerationPreset[] = []

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Invalid generation ${field}`)
  }
  return value
}

function readInteger(value: unknown, field: string, minimum: number): number {
  const number = readNumber(value, field)
  if (!Number.isInteger(number) || number < minimum) {
    throw new TypeError(`Invalid generation ${field}`)
  }
  return number
}

function readLineup(value: unknown, field: string): GenerationLineup {
  if (!isRecord(value)) throw new TypeError(`Invalid generation ${field}`)

  const heroes = value['heroes']
  const ratio = value['ratio']
  if (!isRecord(heroes) || !Array.isArray(ratio) || ratio.length !== 3) {
    throw new TypeError(`Invalid generation ${field}`)
  }

  const shares = ratio.map((share) => readNumber(share, `${field} ratio`))
  if (shares.some((share) => share < 0) || shares.reduce((sum, share) => sum + share, 0) !== 100) {
    throw new TypeError(`Invalid generation ${field} ratio`)
  }

  const readHero = (type: TroopType): string => {
    const hero = heroes[type]
    if (typeof hero !== 'string' || hero.trim() === '') {
      throw new TypeError(`Invalid generation ${field} hero`)
    }
    return hero
  }

  return {
    heroes: {
      infantry: readHero('infantry'),
      lancer: readHero('lancer'),
      marksman: readHero('marksman'),
    },
    ratio: [shares[0] ?? 0, shares[1] ?? 0, shares[2] ?? 0],
  }
}

function readPreset(value: unknown): GenerationPreset {
  if (!isRecord(value)) throw new TypeError('Invalid generation preset')
  return {
    generation: readInteger(value['generation'], 'generation', 1),
    tier: readInteger(value['tier'], 'tier', 1),
    fc: readInteger(value['fc'], 'fc', 0),
    baseStat: readNumber(value['baseStat'], 'baseStat'),
    totalTroops: readNumber(value['totalTroops'], 'totalTroops'),
    attack: readLineup(value['attack'], 'attack'),
    defense: readLineup(value['defense'], 'defense'),
  }
}

export function parseGenerationPresets(payload: unknown): readonly GenerationPreset[] {
  if (!isRecord(payload) || !Array.isArray(payload['generations'])) {
    throw new TypeError('Invalid generation presets response')
  }

  const presets = payload['generations'].map(readPreset).sort((a, b) => a.generation - b.generation)
  if (presets.length === 0) throw new TypeError('Empty generation presets response')
  if (new Set(presets.map((preset) => preset.generation)).size !== presets.length) {
    throw new TypeError('Duplicate generation presets')
  }
  return presets
}

export async function loadGenerationPresets(
  apiBase: string,
  signal?: AbortSignal,
): Promise<readonly GenerationPreset[]> {
  const response = await fetch(`${apiBase}/v1/presets`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Preset API error ${response.status}`)

  presets = parseGenerationPresets(await response.json())
  return presets
}

export function getGenerationPresets(): readonly GenerationPreset[] {
  return presets
}

export function getGenerationPreset(generation: number): GenerationPreset | null {
  return presets.find((preset) => preset.generation === generation) ?? null
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
