import { HERO_SKILLS } from './hero-skills'
import { getHeroByName, TROOP_TYPES, type TroopType } from './heroes'
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
  slot?: string
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

export interface BattleSkillRow {
  label: string
  activations: number | null
}

interface HeroActivations {
  bySkill: Map<string, number>
  bySlot: Map<string, number>
}

function indexSkillActivations(skills: readonly SkillActivation[]): Map<string, HeroActivations> {
  const index = new Map<string, HeroActivations>()
  for (const skill of skills) {
    if (skill.kind !== 'hero') continue
    const owner = skill.owner.toLowerCase()
    const entry = index.get(owner) ?? { bySkill: new Map(), bySlot: new Map() }
    entry.bySkill.set(skill.skill.toLowerCase(), skill.activations_mean)
    if (skill.slot) entry.bySlot.set(skill.slot.toUpperCase(), skill.activations_mean)
    index.set(owner, entry)
  }
  return index
}

interface HeroSkillSlots {
  names: readonly (string | null)[]
  known: boolean
}

function heroSkillSlots(hero: string): HeroSkillSlots {
  const entry = getHeroByName(hero)
  const slots = entry ? HERO_SKILLS[entry.id] : undefined
  return {
    names: [slots?.[0] ?? null, slots?.[1] ?? null, slots?.[2] ?? null],
    known: Boolean(slots && slots.length > 0),
  }
}

export function buildSkillRows(
  heroes: Partial<Record<TroopType, string>>,
  skills: readonly SkillActivation[],
): BattleSkillRow[] {
  const index = indexSkillActivations(skills)
  return TROOP_TYPES.flatMap(({ id }) => {
    const hero = heroes[id]
    if (!hero) {
      return [
        { label: '', activations: null },
        { label: '', activations: null },
        { label: '', activations: null },
      ]
    }

    const activations = index.get(hero.toLowerCase())
    const { names, known } = heroSkillSlots(hero)
    return names.map((skillName, slotIndex) => {
      const slot = `S${slotIndex + 1}`
      const labeled = !known || skillName !== null
      const value = labeled
        ? activations?.bySlot.get(slot) ??
          (skillName ? activations?.bySkill.get(skillName.toLowerCase()) : undefined) ??
          activations?.bySkill.get(slot.toLowerCase()) ??
          null
        : null
      return { label: labeled ? `${hero} ${slot}` : '', activations: value }
    })
  })
}

export interface BattleSkillRowPair {
  kind: 'hero' | 'troop'
  left: BattleSkillRow
  right: BattleSkillRow
}

export interface BattleSkillSide {
  heroes: Partial<Record<TroopType, string>>
  skills: readonly SkillActivation[]
}

const TROOP_SKILL_ORDER: Record<TroopType, readonly string[]> = {
  infantry: ['MasterBrawler', 'BandsOfSteel', 'CrystalShield', 'BodyOfLight', 'IndomitableWall'],
  lancer: ['Charge', 'Ambusher', 'CrystalLance', 'IncandescentField', 'MeridianPhalanx'],
  marksman: ['RangedStrike', 'Volley', 'CrystalGunpowder', 'FlameCharge', 'Starfire'],
}

interface TroopSkillActivation {
  name: string
  activations: number
}

function troopTypeFromOwner(owner: string): TroopType | null {
  const prefix = 'troopskills:'
  const normalized = owner.trim().toLowerCase()
  if (!normalized.startsWith(prefix)) return null
  const type = normalized.slice(prefix.length)
  return TROOP_TYPES.find(({ id }) => id === type)?.id ?? null
}

function indexTroopActivations(
  skills: readonly SkillActivation[],
): Map<TroopType, Map<string, TroopSkillActivation>> {
  const index = new Map<TroopType, Map<string, TroopSkillActivation>>()
  for (const skill of skills) {
    if (skill.kind !== 'troop') continue
    const type = troopTypeFromOwner(skill.owner)
    if (!type) continue
    const byName = index.get(type) ?? new Map<string, TroopSkillActivation>()
    byName.set(skill.skill.toLowerCase(), {
      name: skill.skill,
      activations: skill.activations_mean,
    })
    index.set(type, byName)
  }
  return index
}

function formatTroopSkillName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
}

function orderedTroopSkills(
  type: TroopType,
  left: ReadonlyMap<string, TroopSkillActivation>,
  right: ReadonlyMap<string, TroopSkillActivation>,
): TroopSkillActivation[] {
  const union = new Map<string, TroopSkillActivation>()
  for (const [key, value] of left) union.set(key, value)
  for (const [key, value] of right) if (!union.has(key)) union.set(key, value)

  const ordered: TroopSkillActivation[] = []
  for (const name of TROOP_SKILL_ORDER[type]) {
    const key = name.toLowerCase()
    const value = union.get(key)
    if (!value) continue
    ordered.push(value)
    union.delete(key)
  }
  ordered.push(...[...union.values()].sort((a, b) => a.name.localeCompare(b.name)))
  return ordered
}

export function buildBattleSkillRows(
  left: BattleSkillSide,
  right: BattleSkillSide,
): BattleSkillRowPair[] {
  const leftHeroRows = buildSkillRows(left.heroes, left.skills)
  const rightHeroRows = buildSkillRows(right.heroes, right.skills)
  const leftTroops = indexTroopActivations(left.skills)
  const rightTroops = indexTroopActivations(right.skills)
  const rows: BattleSkillRowPair[] = []

  TROOP_TYPES.forEach(({ id }, classIndex) => {
    for (let slot = 0; slot < 3; slot += 1) {
      const index = classIndex * 3 + slot
      rows.push({
        kind: 'hero',
        left: leftHeroRows[index] ?? { label: '', activations: null },
        right: rightHeroRows[index] ?? { label: '', activations: null },
      })
    }

    const leftMap = leftTroops.get(id)
    const rightMap = rightTroops.get(id)
    if (!leftMap && !rightMap) return

    for (const troop of orderedTroopSkills(id, leftMap ?? new Map(), rightMap ?? new Map())) {
      const key = troop.name.toLowerCase()
      const leftEntry = leftMap?.get(key)
      const rightEntry = rightMap?.get(key)
      rows.push({
        kind: 'troop',
        left: leftEntry
          ? { label: formatTroopSkillName(leftEntry.name), activations: leftEntry.activations }
          : { label: '', activations: null },
        right: rightEntry
          ? { label: formatTroopSkillName(rightEntry.name), activations: rightEntry.activations }
          : { label: '', activations: null },
      })
    }
  })

  return rows
}

const COUNT_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatBattleCount(value: number): string {
  return Number.isFinite(value) ? COUNT_FORMAT.format(Math.max(0, Math.round(value))) : '–'
}

export function formatWinRate(value: number): string {
  const rate = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0
  return `${(rate * 100).toFixed(1)}%`
}

export function formatActivations(value: number | null): string {
  if (value === null) return '–'
  return Number.isFinite(value) ? value.toFixed(1) : '–'
}

export interface SimulationFailure {
  kind: 'timeout' | 'rate-limit' | 'network' | 'api'
  detail?: string
  retryAfterSeconds?: number | null
}

export interface SimulationFailureContext {
  apiBase?: string
  localApi?: boolean
}

export function formatSimulationFailure(
  failure: SimulationFailure,
  context: SimulationFailureContext = {},
): string {
  switch (failure.kind) {
    case 'timeout':
      return 'The simulation timed out. Try again.'
    case 'rate-limit': {
      const seconds = failure.retryAfterSeconds
      if (seconds !== undefined && seconds !== null && seconds > 0) {
        return `Too many simulations at once. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`
      }
      return 'Too many simulations at once. Wait 10 seconds and try again.'
    }
    case 'network':
      return context.localApi && context.apiBase
        ? `Could not reach the simulation engine at ${context.apiBase}. Is it running?`
        : 'The simulation service is busy or unreachable. Wait a few seconds and try again.'
    case 'api':
      return failure.detail ? `Simulation failed: ${failure.detail}` : 'Simulation failed. Try again.'
  }
}
