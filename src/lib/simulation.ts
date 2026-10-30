import { TROOP_TYPES, type TroopType } from './heroes'
import { STAT_BONUSES } from './stat-bonuses'
import {
  DEFAULT_TROOP_FC,
  DEFAULT_TROOP_T12_SKILL,
  DEFAULT_TROOP_TIER,
} from './troop-power'

export type SimulatorSide = 'left' | 'right'

export interface TroopLoadout {
  tier: number
  fc: number
  count: number
  t12: number
}

export interface SimulatorSideState {
  heroes: Partial<Record<TroopType, string>>
  joiners: (string | null)[]
  troops: Record<TroopType, TroopLoadout>
  stats: Record<string, number>
}

export interface SimulatorState {
  left: SimulatorSideState
  right: SimulatorSideState
}

export interface EngineHero {
  name: string
  s1: number
  s2: number
  s3: number
}

export interface EngineJoiner {
  name: string
  s1: number
}

export interface EngineTroopGroup {
  tier: number
  fc: number
  count: number
}

export interface EngineSide {
  name: string
  heroes: EngineHero[]
  joiner_heroes: EngineJoiner[]
  troops: Partial<Record<TroopType, EngineTroopGroup>>
  stats: { inf: number[]; lanc: number[]; mark: number[] }
  t12: Record<TroopType, number>
}

export interface EngineCase {
  attacker: EngineSide
  defender: EngineSide
}

export interface SkillActivation {
  side: 'att' | 'def'
  kind: 'hero' | 'troop'
  owner: string
  skill: string
  source: string
  activations_mean: number
  activations_per_round: number
  kills_mean: number
}

export interface SimulationSideSummary {
  initial?: number[]
  survivors_mean: number[]
  survivors_p10: number[]
  survivors_p50: number[]
  survivors_p90: number[]
  survivors_rate_mean?: number[]
  total_mean: number
  total_p10?: number
  total_p50?: number
  total_p90?: number
  rate_mean: number
  wipe_rate: number
}

export interface SimulationResult {
  api_version: string
  engine_version: string
  elapsed_ms: number
  seeds: number
  threads: number
  initial: { att: number; def: number }
  att: SimulationSideSummary
  def: SimulationSideSummary
  margin: { mean: number; p10: number; p50: number; p90: number }
  win_rate?: { att: number; def: number; draw: number }
  margin_win_rate?: { att: number; def: number; draw: number }
  att_win_rate: number
  rounds: { mean: number; min: number; max: number; p50: number }
  skills?: { att: SkillActivation[]; def: SkillActivation[] }
  warnings?: string[]
}

export const SIMULATION_SEEDS = 256
export const SKILL_LEVEL = 5

const STAT_NAMES = ['attack', 'defense', 'lethality', 'health'] as const

function caption(root: ParentNode, selector: string): string | null {
  const text = root.querySelector<HTMLElement>(selector)?.textContent?.trim() ?? ''
  return text === '' || text === 'Select' ? null : text
}

function parseCount(raw: string | null | undefined): number {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits === '' ? 0 : Number(digits)
}

function parseLabeledInt(raw: string | null | undefined, fallback: number): number {
  const match = (raw ?? '').match(/\d+/)
  return match ? Number(match[0]) : fallback
}

function parsePercent(raw: string | null | undefined): number {
  const value = Number((raw ?? '').trim().replace(',', '.'))
  return Number.isFinite(value) ? Math.max(value, -100) : 0
}

function readSide(root: ParentNode, side: SimulatorSide): SimulatorSideState {
  const heroes: Partial<Record<TroopType, string>> = {}
  for (const { id } of TROOP_TYPES) {
    const name = caption(
      root,
      `[data-hero-slot][data-hero-side="${side}"][data-hero-type="${id}"] [data-hero-caption]`,
    )
    if (name) heroes[id] = name
  }

  const joiners = Array.from({ length: 4 }, (_, index) =>
    caption(
      root,
      `[data-joiner-slot][data-joiner-side="${side}"][data-joiner-index="${index + 1}"] [data-joiner-caption]`,
    ),
  )

  const troops = {} as Record<TroopType, TroopLoadout>
  for (const { id } of TROOP_TYPES) {
    const card = root.querySelector<HTMLElement>(
      `[data-troop-power-side="${side}"] [data-troop-type="${id}"]`,
    )
    const tier = parseLabeledInt(
      card?.querySelector<HTMLElement>('[data-troop-tier-label]')?.textContent,
      DEFAULT_TROOP_TIER,
    )
    const fc = parseLabeledInt(
      card?.querySelector<HTMLElement>('[data-troop-fc-value]')?.textContent,
      DEFAULT_TROOP_FC,
    )
    const t12 = parseLabeledInt(
      card?.querySelector<HTMLElement>('[data-troop-t12-value]')?.textContent,
      DEFAULT_TROOP_T12_SKILL,
    )
    troops[id] = {
      tier: Math.min(Math.max(tier, 1), 12),
      fc: Math.min(Math.max(fc, 0), 10),
      count: parseCount(card?.querySelector<HTMLInputElement>('input[data-troop-count]')?.value),
      t12: Math.min(Math.max(t12, 0), 24),
    }
  }

  const stats: Record<string, number> = {}
  for (const stat of STAT_BONUSES) {
    stats[stat.id] = parsePercent(
      root.querySelector<HTMLInputElement>(`#stat-${stat.id}-${side}`)?.value,
    )
  }

  return { heroes, joiners, troops, stats }
}

export function readSimulatorState(root: ParentNode = document): SimulatorState {
  return { left: readSide(root, 'left'), right: readSide(root, 'right') }
}

function sideTotal(side: SimulatorSideState): number {
  return TROOP_TYPES.reduce((total, type) => total + side.troops[type.id].count, 0)
}

export function validateSimulatorState(state: SimulatorState): string | null {
  if (sideTotal(state.left) === 0 || sideTotal(state.right) === 0) {
    return 'Enter troop counts for both sides before simulating.'
  }
  return null
}

function statRow(side: SimulatorSideState, type: TroopType): number[] {
  return STAT_NAMES.map((name) => {
    const value = side.stats[`${type}-${name}`] ?? 0
    return Number.isFinite(value) ? Math.max(value, -100) : 0
  })
}

function buildSide(side: SimulatorSideState, name: string): EngineSide {
  const heroes = TROOP_TYPES.flatMap(({ id }) => {
    const hero = side.heroes[id]
    return hero ? [{ name: hero, s1: SKILL_LEVEL, s2: SKILL_LEVEL, s3: SKILL_LEVEL }] : []
  })
  const joiners = side.joiners.flatMap((joiner) =>
    joiner ? [{ name: joiner, s1: SKILL_LEVEL }] : [],
  )
  const troops: Partial<Record<TroopType, EngineTroopGroup>> = {}
  for (const { id } of TROOP_TYPES) {
    const loadout = side.troops[id]
    if (loadout.count > 0) {
      troops[id] = { tier: loadout.tier, fc: loadout.fc, count: loadout.count }
    }
  }
  return {
    name,
    heroes,
    joiner_heroes: joiners,
    troops,
    stats: {
      inf: statRow(side, 'infantry'),
      lanc: statRow(side, 'lancer'),
      mark: statRow(side, 'marksman'),
    },
    t12: {
      infantry: side.troops.infantry.t12,
      lancer: side.troops.lancer.t12,
      marksman: side.troops.marksman.t12,
    },
  }
}

export function buildEngineCase(state: SimulatorState): EngineCase {
  return {
    attacker: buildSide(state.left, 'Left'),
    defender: buildSide(state.right, 'Right'),
  }
}

function survivors(summary: SimulationSideSummary): string {
  return TROOP_TYPES.map(
    (type, index) =>
      `${type.shortLabel} ${(summary.survivors_mean[index] ?? 0).toFixed(1)}`,
  ).join(' / ')
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(4)}`
}

export function formatSimulationResult(result: SimulationResult): string {
  return [
    `Engine ${result.engine_version} · API ${result.api_version} · ${result.seeds} seeds · ${result.threads} threads · ${result.elapsed_ms.toFixed(1)} ms`,
    `ATT  ${survivors(result.att)} · ${(result.att.rate_mean * 100).toFixed(1)}% left · wipe ${(result.att.wipe_rate * 100).toFixed(1)}%`,
    `DEF  ${survivors(result.def)} · ${(result.def.rate_mean * 100).toFixed(1)}% left · wipe ${(result.def.wipe_rate * 100).toFixed(1)}%`,
    `Margin ${signed(result.margin.mean)} (p10 ${signed(result.margin.p10)}, p50 ${signed(result.margin.p50)}, p90 ${signed(result.margin.p90)})`,
    `ATT win ${(result.att_win_rate * 100).toFixed(1)}% · rounds ${result.rounds.mean.toFixed(1)} (${result.rounds.min}-${result.rounds.max})`,
    ...(result.warnings?.length ? [`Warnings: ${result.warnings.join('; ')}`] : []),
  ].join('\n')
}
