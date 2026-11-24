import bundledPresets from '../data/generation-presets.json'
import type { TroopType } from './heroes'
import { normalizeBuffs, type SideBuffs } from './stat-buffs'

export interface GenerationLineup {
  heroes: Record<TroopType, string>
  ratio: readonly [number, number, number]
  joiners: readonly string[]
  /** Raw panel (base + hero stats + gear + always-on), before buffs/widgets. */
  rawStats?: Record<TroopType, readonly number[]>
  /** Effective panel with the preset's max city/pets/Gareth/widgets applied. */
  stats?: Record<TroopType, readonly number[]>
  /** Buffs the preset assumes (city 20, pets max, Gareth 5). */
  modifiers?: SideBuffs
}

export interface GenerationPreset {
  generation: number
  tier: number
  fc: number
  t12Skills: number
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

function readStatPanel(
  value: unknown,
  field: string,
): Record<TroopType, readonly number[]> | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new TypeError(`Invalid generation ${field}`)
  const read = (type: TroopType): readonly number[] => {
    const stats = value[type]
    if (!Array.isArray(stats) || stats.length < 4) {
      throw new TypeError(`Invalid generation ${field} ${type}`)
    }
    return stats.slice(0, 4).map((stat) => readNumber(stat, `${field} ${type}`))
  }
  return {
    infantry: read('infantry'),
    lancer: read('lancer'),
    marksman: read('marksman'),
  }
}

function readModifiers(value: unknown, field: string): SideBuffs | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new TypeError(`Invalid generation ${field}`)
  return normalizeBuffs(value as Partial<SideBuffs>)
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

  const rawJoiners = value['joiners']
  if (rawJoiners !== undefined && !Array.isArray(rawJoiners)) {
    throw new TypeError(`Invalid generation ${field} joiners`)
  }
  const joiners = (rawJoiners ?? []).map((joiner) => {
    if (typeof joiner !== 'string' || joiner.trim() === '') {
      throw new TypeError(`Invalid generation ${field} joiner`)
    }
    return joiner
  })
  if (joiners.length > 4) {
    throw new TypeError(`Invalid generation ${field} joiner count`)
  }

  return {
    heroes: {
      infantry: readHero('infantry'),
      lancer: readHero('lancer'),
      marksman: readHero('marksman'),
    },
    ratio: [shares[0] ?? 0, shares[1] ?? 0, shares[2] ?? 0],
    joiners,
    rawStats: readStatPanel(value['rawStats'], `${field} rawStats`),
    stats: readStatPanel(value['stats'], `${field} stats`),
    modifiers: readModifiers(value['modifiers'], `${field} modifiers`),
  }
}

function readPreset(value: unknown): GenerationPreset {
  if (!isRecord(value)) throw new TypeError('Invalid generation preset')
  return {
    generation: readInteger(value['generation'], 'generation', 1),
    tier: readInteger(value['tier'], 'tier', 1),
    fc: readInteger(value['fc'], 'fc', 0),
    t12Skills:
      value['t12Skills'] === undefined
        ? 0
        : Math.min(readInteger(value['t12Skills'], 't12Skills', 0), 24),
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

/**
 * Load the presets bundled with the site.
 *
 * The simulator is fully client-side: this snapshot is bundled with the site.
 * Refresh it with `reports/loopcal/export_site_presets.py` in `wosutil-sim`
 * when a new generation is published.
 */
export function loadBundledGenerationPresets(): readonly GenerationPreset[] {
  presets = parseGenerationPresets(bundledPresets)
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
