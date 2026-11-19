import { COMBAT_STATS, WIDGET_BONUS, type CombatStat, type SideStatPanel, type WidgetCounts } from './hero-stats'

export type CityModifier = CombatStat | 'enemy_attack' | 'enemy_defense'

export type PetModifier =
  | CombatStat
  | 'enemy_defense'
  | 'enemy_lethality'
  | 'enemy_health'

export interface SideBuffs {
  city: Record<CityModifier, number>
  pets: Record<PetModifier, number>
  gareth: number
}

export const CITY_MODIFIERS: readonly CityModifier[] = [
  'attack',
  'defense',
  'lethality',
  'health',
  'enemy_attack',
  'enemy_defense',
]

export const PET_MODIFIERS: readonly PetModifier[] = [
  'attack',
  'defense',
  'lethality',
  'health',
  'enemy_defense',
  'enemy_lethality',
  'enemy_health',
]

/** City buff/debuff presets exposed by the upstream simulator. */
export const CITY_PRESETS = [0, 10, 20] as const

export const PET_MAX: Readonly<Record<PetModifier, number>> = {
  attack: 10,
  defense: 10,
  lethality: 10,
  health: 10,
  enemy_defense: 10,
  enemy_lethality: 5,
  enemy_health: 5,
}

export const GARETH_MAX = 5

export function cityBuffs(level: number): Record<CityModifier, number> {
  const value = clampPercent(level, 0, 20)
  return CITY_MODIFIERS.reduce(
    (buffs, modifier) => ({ ...buffs, [modifier]: value }),
    {} as Record<CityModifier, number>,
  )
}

export function maxPets(enabled: boolean): Record<PetModifier, number> {
  return PET_MODIFIERS.reduce(
    (buffs, modifier) => ({ ...buffs, [modifier]: enabled ? PET_MAX[modifier] : 0 }),
    {} as Record<PetModifier, number>,
  )
}

export function emptyBuffs(): SideBuffs {
  return {
    city: cityBuffs(0),
    pets: maxPets(false),
    gareth: 0,
  }
}

export function maxBuffs(): SideBuffs {
  return {
    city: cityBuffs(20),
    pets: maxPets(true),
    gareth: GARETH_MAX,
  }
}

export function normalizeBuffs(buffs: Partial<SideBuffs> | null | undefined): SideBuffs {
  const city = cityBuffs(0)
  for (const modifier of CITY_MODIFIERS) {
    city[modifier] = clampPercent(buffs?.city?.[modifier], 0, 20)
  }
  const pets = maxPets(false)
  for (const modifier of PET_MODIFIERS) {
    const value = Number(buffs?.pets?.[modifier])
    pets[modifier] = Number.isFinite(value)
      ? Math.min(Math.max(value, 0), PET_MAX[modifier])
      : 0
  }
  return {
    city,
    pets,
    gareth: clampPercent(buffs?.gareth, 0, GARETH_MAX),
  }
}

export function cityLevel(city: Readonly<Record<CityModifier, number>>): number {
  const values = CITY_MODIFIERS.map((modifier) => city[modifier])
  if (values.every((value) => value === 0)) return 0
  for (const preset of CITY_PRESETS) {
    if (values.every((value) => value === preset)) return preset
  }
  return values.find((value) => value > 0) ?? 0
}

export function petsEnabled(pets: Readonly<Record<PetModifier, number>>): boolean {
  return PET_MODIFIERS.some((modifier) => pets[modifier] > 0)
}

export interface EffectiveBuckets {
  up: Record<CombatStat, number>
  down: Record<CombatStat, number>
}

/**
 * Build the numerator/denominator percentages for one side.
 *
 * Own city/pet bonuses and the side's S4 widgets go into the numerator; the
 * opponent's enemy debuffs and Gareth go into the denominator. Same-bucket
 * percentages add (they never compound).
 */
export function effectiveBuckets(
  own: SideBuffs,
  foe: SideBuffs,
  widgets: WidgetCounts,
): EffectiveBuckets {
  return {
    up: {
      attack: own.city.attack + own.pets.attack + WIDGET_BONUS * 100 * widgets.attack,
      defense: own.city.defense + own.pets.defense + WIDGET_BONUS * 100 * widgets.defense,
      lethality:
        own.city.lethality + own.pets.lethality + WIDGET_BONUS * 100 * widgets.lethality,
      health: own.city.health + own.pets.health + WIDGET_BONUS * 100 * widgets.health,
    },
    down: {
      attack: Math.abs(foe.city.enemy_attack),
      defense: Math.abs(foe.city.enemy_defense) + Math.abs(foe.pets.enemy_defense),
      lethality: Math.abs(foe.pets.enemy_lethality) + foe.gareth,
      health: Math.abs(foe.pets.enemy_health),
    },
  }
}

export function effectiveStat(value: number, stat: CombatStat, buckets: EffectiveBuckets): number {
  return ((100 + value) * (1 + buckets.up[stat] / 100)) / (1 + buckets.down[stat] / 100) - 100
}

/** Inverse of {@link effectiveStat}; used when a displayed stat is edited. */
export function rawStat(effective: number, stat: CombatStat, buckets: EffectiveBuckets): number {
  return ((effective + 100) * (1 + buckets.down[stat] / 100)) / (1 + buckets.up[stat] / 100) - 100
}

/**
 * Apply the upstream effective-stat transform to one side's raw panel.
 *
 * The transform matches `compose_stats_max` in the Python meta tooling.
 */
export function composeEffectiveStats(
  raw: SideStatPanel,
  own: SideBuffs,
  foe: SideBuffs,
  widgets: WidgetCounts,
): SideStatPanel {
  const buckets = effectiveBuckets(own, foe, widgets)
  const panel = {} as SideStatPanel
  for (const type of ['infantry', 'lancer', 'marksman'] as const) {
    const row = {} as Record<CombatStat, number>
    for (const stat of COMBAT_STATS) {
      const value = effectiveStat(raw[type][stat], stat, buckets)
      row[stat] = Math.round(value * 1e6) / 1e6
    }
    panel[type] = row
  }
  return panel
}

export function sideStatRows(panel: SideStatPanel, type: 'infantry' | 'lancer' | 'marksman'): number[] {
  return COMBAT_STATS.map((stat) => panel[type][stat])
}

function clampPercent(value: unknown, min: number, max: number): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(Math.max(number, min), max)
}
