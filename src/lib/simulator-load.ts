import type { TroopType } from './heroes'

export type SimulatorLoadSide = 'left' | 'right'

export interface SimulatorTroopGroup {
  tier: number
  fc: number
  count: number
}

export interface SimulatorTroopLoadout {
  /** Mixed-tier groups of one class, largest group first. */
  groups: SimulatorTroopGroup[]
  t12: number
}

export interface SimulatorBattleSide {
  heroes: Partial<Record<TroopType, string | null>>
  joiners: Array<string | null>
  troops: Record<TroopType, SimulatorTroopLoadout>
  /** Final (game) stat panel in attack, defense, lethality, health order. */
  stats: Record<TroopType, readonly [number, number, number, number]>
}

export interface SimulatorLoadDetail {
  reportId: string
  left: SimulatorBattleSide
  right: SimulatorBattleSide
}

export const SIMULATOR_LOAD_EVENT = 'wosutil:simulator-load'

export function dispatchSimulatorLoad(detail: SimulatorLoadDetail): void {
  document.dispatchEvent(
    new CustomEvent<SimulatorLoadDetail>(SIMULATOR_LOAD_EVENT, { detail }),
  )
}

export function onSimulatorLoad(
  listener: (detail: SimulatorLoadDetail) => void,
): void {
  document.addEventListener(SIMULATOR_LOAD_EVENT, (event) => {
    const detail = (event as CustomEvent<SimulatorLoadDetail>).detail
    if (!detail || !detail.left || !detail.right) return
    listener(detail)
  })
}
