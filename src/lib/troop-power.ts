export type TroopRatio = readonly [number, number, number]

export type TroopRatioControl = 'infantry-lancer' | 'lancer' | 'lancer-marksman'

export interface TroopCountEdit {
  value: string
  caret: number
}

export const MAX_TROOP_COUNT_DIGITS = 12

export const DEFAULT_TROOP_RATIO: TroopRatio = [100 / 3, 100 / 3, 100 / 3]

export const TROOP_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export const TROOP_FC_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export const DEFAULT_TROOP_TIER = 12

export const DEFAULT_TROOP_FC = 10

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function sanitizeTroopCountInput(raw: string, caret = raw.length): TroopCountEdit {
  let value = ''
  let keptBeforeCaret = 0

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index] ?? ''
    if (char >= '0' && char <= '9') {
      value += char
      if (index < caret) keptBeforeCaret += 1
    }
  }

  value = value.slice(0, MAX_TROOP_COUNT_DIGITS).replace(/^0+(?=\d)/, '')

  return { value, caret: Math.min(keptBeforeCaret, value.length) }
}

export function parseTroopCount(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const { value } = sanitizeTroopCountInput(raw)
  return value === '' ? null : Number(value)
}

export function formatTroopCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const count = Math.max(0, Math.trunc(value))
  return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatTroopPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`
}

export function allocateTroopCounts(
  total: number,
  ratio: TroopRatio,
): [number, number, number] {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0
  const ratioTotal = ratio[0] + ratio[1] + ratio[2]
  if (safeTotal === 0 || ratioTotal <= 0) return [0, 0, 0]

  const exact = ratio.map((share) => (safeTotal * share) / ratioTotal)
  const counts = exact.map((share) => Math.floor(share))
  const remainder = safeTotal - counts.reduce((sum, count) => sum + count, 0)
  const order = exact
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)

  for (let step = 0; step < remainder; step += 1) {
    const target = order[step % order.length]
    if (!target) continue
    counts[target.index] = (counts[target.index] ?? 0) + 1
  }

  return [counts[0] ?? 0, counts[1] ?? 0, counts[2] ?? 0]
}

export function troopRatioPositions(ratio: TroopRatio): [number, number] {
  return [ratio[0], ratio[0] + ratio[1]]
}

export function moveTroopRatioDivider(
  ratio: TroopRatio,
  divider: 0 | 1,
  percent: number,
): TroopRatio {
  const [infantry, lancer, marksman] = ratio
  const first = infantry
  const second = infantry + lancer

  if (divider === 0) {
    const next = clamp(percent, 0, second)
    return [next, second - next, marksman]
  }

  const next = clamp(percent, first, 100)
  return [first, next - first, 100 - next]
}

export function shiftTroopRatioMiddle(ratio: TroopRatio, delta: number): TroopRatio {
  const lancer = ratio[1]
  const nextInfantry = clamp(ratio[0] + delta, 0, 100 - lancer)
  return [nextInfantry, lancer, 100 - nextInfantry - lancer]
}

export function nudgeTroopRatio(
  ratio: TroopRatio,
  control: TroopRatioControl,
  direction: 1 | -1,
  step = 1,
): TroopRatio {
  const delta = direction * step

  if (control === 'infantry-lancer') {
    return moveTroopRatioDivider(ratio, 0, ratio[0] + delta)
  }

  if (control === 'lancer-marksman') {
    return moveTroopRatioDivider(ratio, 1, ratio[0] + ratio[1] + delta)
  }

  return shiftTroopRatioMiddle(ratio, delta)
}
