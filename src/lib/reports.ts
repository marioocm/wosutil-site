import { getHeroByName } from './heroes'

export type SideKey = 'attacker' | 'defender'
export type TroopClass = 'infantry' | 'lancer' | 'marksman'
export type ReportResult = 'attacker' | 'defender' | 'draw' | 'none'

export interface HeroSet {
  infantry: string | null
  lancer: string | null
  marksman: string | null
}

export interface Ratio {
  infantry: number
  lancer: number
  marksman: number
}

export interface ReportListItem {
  id: string
  result: ReportResult
  total_troops: number
  attacker_troops: number
  defender_troops: number
  attacker_survivors: number
  defender_survivors: number
  heroes: Record<SideKey, HeroSet>
  joiners: Record<SideKey, string[]>
  ratio: Record<SideKey, Ratio>
  tier_range: [number, number] | null
  fc_range: [number, number] | null
  has_t12: boolean
}

export interface ReportList {
  items: ReportListItem[]
  next_cursor: number | null
  total: number
}

export interface Totals {
  troops: number
  losses: number
  injured: number
  lightly_injured: number
  survivors: number
}

export interface Troop {
  class: TroopClass
  tier: number
  furnace: string
  count: number
  kills: number
  losses: number
  injured: number
  lightly_injured: number
  survivors: number
}

export interface SkillDetail {
  class: TroopClass
  skill: string
  triggered: number | null
  kills: number | null
}

export interface SideDetail {
  totals: Totals
  heroes: HeroSet
  joiners: string[]
  t12_skills: Record<TroopClass, number>
  stat_bonuses: Record<TroopClass, Record<'attack' | 'defense' | 'lethality' | 'health', number>>
  troops: Troop[]
  skill_details: SkillDetail[]
}

export interface ReportDetail {
  id: string
  schema_version: number
  result: ReportResult
  attacker: SideDetail
  defender: SideDetail
  ratio: Record<SideKey, Ratio>
}

export interface ReportMeta {
  heroes: string[]
  joiners: string[]
  tiers: number[]
  furnaces: string[]
  results: Record<string, number>
  total: number
}

export interface ReportStats {
  reports: number
  total_troops: number
  avg_troops: number
  attacker_wins: number
  defender_wins: number
  no_wipe: number
  draws: number
  attacker_win_rate: number
  defender_win_rate: number
}

export interface ReportFilters {
  heroes?: ReportHeroFilter[]
  joiners?: ReportHeroFilter[]
  mode?: ReportMode
  result?: string
  tier_min?: number
  tier_max?: number
  fc_min?: number
  fc_max?: number
  max_gen?: number
  max_survivors?: number
  has_t12?: boolean
}

export const REPORT_FILTER_SIDES = ['any', 'attacker', 'defender', 'both'] as const
export type ReportFilterSide = (typeof REPORT_FILTER_SIDES)[number]

export const REPORT_MODES = ['rally', '1v1'] as const
export type ReportMode = (typeof REPORT_MODES)[number]

export interface ReportHeroFilter {
  name: string
  side: ReportFilterSide
}

const SPECIAL_HEROES: Record<string, string> = {
  bokan: 'Lumak Bokan',
  'wu ming': 'Wu Ming',
  'seo-yoon': 'Seo-Yoon',
  'ling xue': 'Ling Xue',
}

export const TROOP_CLASSES: TroopClass[] = ['infantry', 'lancer', 'marksman']

export function apiBase(): string {
  const configured = import.meta.env.PUBLIC_REPORTS_API as string | undefined
  return (configured || '/api').replace(/\/+$/, '')
}

export function heroName(value: string | null | undefined): string {
  const text = (value || '').trim()
  if (!text) return '—'
  const key = text.toLowerCase()
  if (SPECIAL_HEROES[key]) return SPECIAL_HEROES[key]
  return text
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function classLabel(value: string): string {
  if (value === 'infantry') return 'Infantry'
  if (value === 'lancer') return 'Lancer'
  if (value === 'marksman') return 'Marksman'
  return value
}

export function resultLabel(value: ReportResult): string {
  if (value === 'attacker') return 'Attacker victory'
  if (value === 'defender') return 'Defender victory'
  if (value === 'draw') return 'Draw'
  return 'No wipe'
}

export function resultShort(value: ReportResult): string {
  if (value === 'attacker') return 'ATT WIN'
  if (value === 'defender') return 'DEF WIN'
  if (value === 'draw') return 'DRAW'
  return 'NO WIPE'
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-US')

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return NUMBER_FORMAT.format(Math.round(value))
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function formatShare(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${Math.round(value * 10) / 10}%`
}

export function survivorRate(survivors: number, troops: number): number {
  return troops > 0 ? survivors / troops : 0
}

export function formatSkill(value: string): string {
  return value.replace(/_/g, ' ')
}

function maxGeneration(names: Array<string | null | undefined>): number | null {
  let result: number | null = null
  for (const name of names) {
    if (!name) continue
    const generation = getHeroByName(name)?.generation ?? null
    if (generation !== null && (result === null || generation > result)) result = generation
  }
  return result
}

export function heroGeneration(name: string | null | undefined): number | null {
  return name ? getHeroByName(name)?.generation ?? null : null
}

export function reportGeneration(item: {
  heroes: Record<SideKey, HeroSet>
  joiners: Record<SideKey, string[]>
}): number | null {
  return maxGeneration([
    item.heroes.attacker.infantry,
    item.heroes.attacker.lancer,
    item.heroes.attacker.marksman,
    item.heroes.defender.infantry,
    item.heroes.defender.lancer,
    item.heroes.defender.marksman,
    ...(item.joiners.attacker || []),
    ...(item.joiners.defender || []),
  ])
}

export function generationLabel(generation: number | null): string {
  return generation === null ? 'Gen —' : `Gen ${generation}`
}

export function generationFilterLabel(generation: number | null | undefined): string {
  return generation ? `Gen ${generation} or older` : 'All gens'
}

export function parseGeneration(value: string | null | undefined): number | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  const number = Number(text)
  return Number.isInteger(number) && number > 0 ? number : null
}

export const REPORT_TIER_RANGE = [1, 12] as const

export const REPORT_FC_RANGE = [0, 10] as const

/** Reads one optional tier/FC bound from a query-string value. */
export function parseLevelBound(
  value: string | null | undefined,
  min: number,
  max: number,
): number | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  const number = Number(text)
  return Number.isInteger(number) && number >= min && number <= max ? number : null
}

/** Survivors caps offered by the archive toggle (strictly under each value). */
export const REPORT_SURVIVOR_CAPS = [50, 25, 10] as const

/** Reads the survivors cap percentage ("<50%" is stored as 50). */
export function parseSurvivors(value: string | null | undefined): number | null {
  const number = parseLevelBound(value, 1, 100)
  return number !== null && (REPORT_SURVIVOR_CAPS as readonly number[]).includes(number)
    ? number
    : null
}

export function isReportFilterSide(value: string): value is ReportFilterSide {
  return (REPORT_FILTER_SIDES as readonly string[]).includes(value)
}

export function parseReportFilterEntry(value: string): ReportHeroFilter | null {
  const text = value.trim()
  if (!text) return null
  const separator = text.lastIndexOf(':')
  if (separator > 0) {
    const side = text.slice(separator + 1).trim().toLowerCase()
    if (isReportFilterSide(side)) {
      const name = text.slice(0, separator).trim().toLowerCase()
      return name ? { name, side } : null
    }
  }
  return { name: text.toLowerCase(), side: 'any' }
}

export function reportFilterEntryValue(entry: ReportHeroFilter): string {
  return entry.side === 'any' ? entry.name : `${entry.name}:${entry.side}`
}

export function reportFilterSideLabel(side: ReportFilterSide): string {
  if (side === 'attacker') return 'Attacker'
  if (side === 'defender') return 'Defender'
  if (side === 'both') return 'Both'
  return 'Any'
}

/** Reserved archive hero name: reports with no main hero on either side. */
export const NO_HEROES_FILTER = 'none'

export function isNoHeroesFilter(entry: ReportHeroFilter): boolean {
  return entry.name === NO_HEROES_FILTER
}

export function heroFilterLabel(entry: ReportHeroFilter): string {
  return isNoHeroesFilter(entry) ? 'No heroes' : heroName(entry.name)
}

/** "No heroes" is exclusive: it replaces every concrete hero filter. */
export function normalizeHeroFilters(entries: ReportHeroFilter[]): ReportHeroFilter[] {
  return entries.some(isNoHeroesFilter)
    ? [{ name: NO_HEROES_FILTER, side: 'any' }]
    : entries
}

export function isReportMode(value: string): value is ReportMode {
  return (REPORT_MODES as readonly string[]).includes(value)
}

export function reportModeLabel(mode: ReportMode): string {
  return mode === 'rally' ? 'Rally' : '1v1'
}

export function isRally(item: { joiners: Record<SideKey, string[]> }): boolean {
  return (item.joiners.attacker?.length ?? 0) + (item.joiners.defender?.length ?? 0) > 0
}

export function maxTroopLevel(item: {
  tier_range: [number, number] | null
  fc_range: [number, number] | null
}): { tier: number | null; fc: number | null } {
  return {
    tier: item.tier_range ? item.tier_range[1] : null,
    fc: item.fc_range ? item.fc_range[1] : null,
  }
}

export function furnaceLevel(value: string | null | undefined): number | null {
  const text = String(value ?? '')
    .trim()
    .toUpperCase()
  if (!text) return null
  const digits = text.startsWith('FC') ? text.slice(2) : text
  return /^\d+$/.test(digits) ? Number(digits) : null
}

export interface TroopLevelAverages {
  tier: number | null
  fc: number | null
  maxTier: number | null
  count: number
}

/**
 * Count-weighted tier and FC of one troop class, truncated like the game's
 * troop panel (10.99 -> 10.9, FC 9.99 -> 9). Mixed tiers include every
 * group; a group with no furnace counts as FC0.
 */
export function averageTroopLevel(
  troops: Array<Pick<Troop, 'tier' | 'furnace' | 'count'>>,
): TroopLevelAverages {
  let count = 0
  let tierSum = 0
  let fcSum = 0
  let maxTier: number | null = null
  for (const troop of troops) {
    const troopCount = Number(troop.count)
    const tier = Number(troop.tier)
    if (!Number.isFinite(troopCount) || troopCount <= 0 || !Number.isFinite(tier)) continue
    count += troopCount
    tierSum += tier * troopCount
    fcSum += (furnaceLevel(troop.furnace) ?? 0) * troopCount
    if (maxTier === null || tier > maxTier) maxTier = tier
  }
  if (count <= 0) return { tier: null, fc: null, maxTier, count: 0 }
  return {
    tier: Math.floor((tierSum * 10) / count) / 10,
    fc: Math.floor(fcSum / count),
    maxTier,
    count,
  }
}

export function ratioText(ratio: Ratio): string {
  return `${formatShare(ratio.infantry)} / ${formatShare(ratio.lancer)} / ${formatShare(ratio.marksman)}`
}

export function filterQuery(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const entry of filters.heroes ?? []) {
    if (entry.name.trim()) params.append('hero', reportFilterEntryValue(entry))
  }
  for (const entry of filters.joiners ?? []) {
    if (entry.name.trim()) params.append('joiner', reportFilterEntryValue(entry))
  }
  if (filters.mode) params.set('mode', filters.mode)
  if (filters.result) params.set('result', filters.result)
  if (filters.tier_min !== undefined) params.set('tier_min', String(filters.tier_min))
  if (filters.tier_max !== undefined) params.set('tier_max', String(filters.tier_max))
  if (filters.fc_min !== undefined) params.set('fc_min', String(filters.fc_min))
  if (filters.fc_max !== undefined) params.set('fc_max', String(filters.fc_max))
  if (filters.max_gen) params.set('max_gen', String(filters.max_gen))
  if (filters.max_survivors !== undefined) {
    params.set('max_survivors', String(filters.max_survivors))
  }
  if (filters.has_t12) params.set('has_t12', 'true')
  return params
}

export function buildQuery(filters: ReportFilters, cursor?: number | null, limit = 24): string {
  const params = filterQuery(filters)
  if (cursor !== undefined && cursor !== null) params.set('cursor', String(cursor))
  params.set('limit', String(limit))
  return params.toString()
}

/** Query-string keys the archive reads as filters (including legacy bounds). */
const REPORT_FILTER_KEYS = [
  'hero',
  'joiner',
  'mode',
  'result',
  'tier',
  'fc',
  'tier_min',
  'tier_max',
  'fc_min',
  'fc_max',
  'max_gen',
  'max_survivors',
  'has_t12',
] as const

/** True when a query string explicitly carries archive filter state. */
export function hasReportFilterQuery(params: URLSearchParams): boolean {
  return REPORT_FILTER_KEYS.some((key) => params.has(key))
}

/** Session key that keeps the archive filters across page navigation. */
export const REPORT_FILTERS_STORAGE_KEY = 'wosutil:report-filters'

/** Reads the last applied archive filter query, or an empty string. */
export function readStoredReportFilterQuery(storage: Pick<Storage, 'getItem'>): string {
  try {
    return storage.getItem(REPORT_FILTERS_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

/** Stores the applied archive filter query; an empty query clears it. */
export function storeReportFilterQuery(
  query: string,
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
): void {
  try {
    if (query) storage.setItem(REPORT_FILTERS_STORAGE_KEY, query)
    else storage.removeItem(REPORT_FILTERS_STORAGE_KEY)
  } catch {
    // Storage can be unavailable; the URL still carries the filters.
  }
}

export interface FetchJsonOptions {
  signal?: AbortSignal
  cache?: RequestCache
}

export async function fetchJson<T>(
  path: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    headers: { Accept: 'application/json' },
    signal: options.signal,
    cache: options.cache,
  })
  if (!response.ok) {
    let detail = `API error ${response.status}`
    try {
      const payload = (await response.json()) as { detail?: unknown }
      if (typeof payload.detail === 'string') detail = payload.detail
    } catch {
      // Keep the status message.
    }
    throw new Error(detail)
  }
  return (await response.json()) as T
}

export function reportPath(id: string): string {
  return `${apiBase()}/v1/reports/${encodeURIComponent(id)}`
}

export function reportDownloadPath(id: string): string {
  return `${reportPath(id)}.json`
}

/** Simulator URL that loads one archive battle into its widgets. */
export function simulatorBattlePath(id: string): string {
  return `${import.meta.env.BASE_URL}simulator/?battle=${encodeURIComponent(id)}`
}
