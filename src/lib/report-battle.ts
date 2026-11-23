import { getHeroByName, type TroopType } from './heroes'
import {
  furnaceLevel,
  type ReportDetail,
  type SideDetail,
  type Troop,
  type TroopClass,
} from './reports'
import type {
  SimulatorBattleSide,
  SimulatorLoadDetail,
  SimulatorTroopGroup,
  SimulatorTroopLoadout,
} from './simulator-load'
import { DEFAULT_TROOP_FC, DEFAULT_TROOP_TIER } from './troop-power'

const JOINER_SLOTS = 4
const MAX_T12_LEVEL = 24
const STAT_ORDER = ['attack', 'defense', 'lethality', 'health'] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function finite(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function knownHero(value: string | null | undefined): string | null {
  const name = value?.trim()
  return name ? getHeroByName(name)?.name ?? null : null
}

function joinerSlots(names: readonly string[]): Array<string | null> {
  const slots: Array<string | null> = Array.from({ length: JOINER_SLOTS }, () => null)
  names.slice(0, JOINER_SLOTS).forEach((name, index) => {
    slots[index] = knownHero(name)
  })
  return slots
}

function troopRows(side: SideDetail, troopClass: TroopClass): Troop[] {
  return (side.troops ?? []).filter(
    (troop) => troop.class === troopClass && finite(troop.count) > 0,
  )
}

/** Keep every mixed group, largest first; empty classes keep one default row. */
function troopGroups(
  side: SideDetail,
  troopClass: TroopClass,
): SimulatorTroopGroup[] {
  const groups = troopRows(side, troopClass)
    .map((troop) => ({
      tier: clamp(Math.round(finite(troop.tier)), 1, 12),
      fc: clamp(furnaceLevel(troop.furnace) ?? 0, 0, 10),
      count: Math.max(0, Math.round(finite(troop.count))),
    }))
    .filter((group) => group.count > 0)
    .sort((a, b) => b.count - a.count || b.tier - a.tier || b.fc - a.fc)

  return groups.length > 0
    ? groups
    : [{ tier: DEFAULT_TROOP_TIER, fc: DEFAULT_TROOP_FC, count: 0 }]
}

function troopLoadout(
  side: SideDetail,
  troopClass: TroopClass,
): SimulatorTroopLoadout {
  return {
    groups: troopGroups(side, troopClass),
    t12: clamp(
      Math.round(finite(side.t12_skills?.[troopClass])),
      0,
      MAX_T12_LEVEL,
    ),
  }
}

function statValues(
  side: SideDetail,
  type: TroopType,
): [number, number, number, number] {
  const row = side.stat_bonuses?.[type]
  return [
    finite(row?.[STAT_ORDER[0]]),
    finite(row?.[STAT_ORDER[1]]),
    finite(row?.[STAT_ORDER[2]]),
    finite(row?.[STAT_ORDER[3]]),
  ]
}

function buildSide(side: SideDetail): SimulatorBattleSide {
  return {
    heroes: {
      infantry: knownHero(side.heroes?.infantry),
      lancer: knownHero(side.heroes?.lancer),
      marksman: knownHero(side.heroes?.marksman),
    },
    joiners: joinerSlots(side.joiners ?? []),
    troops: {
      infantry: troopLoadout(side, 'infantry'),
      lancer: troopLoadout(side, 'lancer'),
      marksman: troopLoadout(side, 'marksman'),
    },
    stats: {
      infantry: statValues(side, 'infantry'),
      lancer: statValues(side, 'lancer'),
      marksman: statValues(side, 'marksman'),
    },
  }
}

/** Flatten one archive report into the state the simulator widgets accept. */
export function buildSimulatorBattle(detail: ReportDetail): SimulatorLoadDetail {
  return {
    reportId: detail.id,
    left: buildSide(detail.attacker),
    right: buildSide(detail.defender),
  }
}
