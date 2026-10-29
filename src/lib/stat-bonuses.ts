export interface StatBonus {
  id: string
  label: string
}

export type StatComparison = 'higher' | 'lower' | 'equal' | 'empty'

export interface StatBonusComparison {
  left: StatComparison
  right: StatComparison
}

export interface StatBonusEdit {
  value: string
  caret: number
}

export const STAT_BONUSES: readonly StatBonus[] = [
  { id: 'infantry-attack', label: 'Infantry Attack' },
  { id: 'infantry-defense', label: 'Infantry Defense' },
  { id: 'infantry-lethality', label: 'Infantry Lethality' },
  { id: 'infantry-health', label: 'Infantry Health' },
  { id: 'lancer-attack', label: 'Lancer Attack' },
  { id: 'lancer-defense', label: 'Lancer Defense' },
  { id: 'lancer-lethality', label: 'Lancer Lethality' },
  { id: 'lancer-health', label: 'Lancer Health' },
  { id: 'marksman-attack', label: 'Marksman Attack' },
  { id: 'marksman-defense', label: 'Marksman Defense' },
  { id: 'marksman-lethality', label: 'Marksman Lethality' },
  { id: 'marksman-health', label: 'Marksman Health' },
]

export function parseStatBonus(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export function sanitizeStatBonusInput(raw: string, caret = raw.length): StatBonusEdit {
  let value = ''
  let keptBeforeCaret = 0
  let hasDecimal = false
  let decimalDigits = 0

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index] ?? ''
    let keep = false

    if (char >= '0' && char <= '9') {
      if (!hasDecimal || decimalDigits < 2) {
        value += char
        if (hasDecimal) decimalDigits += 1
        keep = true
      }
    } else if ((char === '.' || char === ',') && !hasDecimal) {
      value += '.'
      hasDecimal = true
      keep = true
    } else if (char === '-' && value === '') {
      value += char
      keep = true
    }

    if (keep && index < caret) keptBeforeCaret += 1
  }

  return { value, caret: Math.min(keptBeforeCaret, value.length) }
}

export function statBonusCents(value: number): number {
  return Math.round(value * 100)
}

export function formatStatBonus(value: number): string {
  return (statBonusCents(value) / 100).toFixed(2)
}

export function normalizeStatBonus(raw: string): string {
  const value = parseStatBonus(raw)
  return value === null ? '' : formatStatBonus(value)
}

export function compareStatBonuses(
  leftRaw: string,
  rightRaw: string,
): StatBonusComparison {
  const left = parseStatBonus(leftRaw)
  const right = parseStatBonus(rightRaw)
  if (left === null || right === null) return { left: 'empty', right: 'empty' }

  const leftCents = statBonusCents(left)
  const rightCents = statBonusCents(right)
  if (leftCents === rightCents) return { left: 'equal', right: 'equal' }

  return leftCents > rightCents
    ? { left: 'higher', right: 'lower' }
    : { left: 'lower', right: 'higher' }
}
