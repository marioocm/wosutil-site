import {
  compareStatBonuses,
  normalizeStatBonus,
  sanitizeStatBonusInput,
  type StatComparison,
} from '../lib/stat-bonuses'

function resizeInput(input: HTMLInputElement): void {
  const display = input.value === '' ? input.placeholder : input.value
  const length = Math.max(display.length, 1)
  input.style.width = `min(calc(${length}ch + 1px), calc(100% - 1.5ch))`
}

function updateComparison(wrapper: HTMLElement | null, state: StatComparison): void {
  if (!wrapper) return
  wrapper.dataset['statState'] = state
}

function updateRow(row: HTMLElement): void {
  const left = row.querySelector<HTMLInputElement>('input[data-stat-side="left"]')
  const right = row.querySelector<HTMLInputElement>('input[data-stat-side="right"]')
  if (!left || !right) return

  const comparison = compareStatBonuses(left.value, right.value)
  updateComparison(row.querySelector<HTMLElement>('[data-stat-value="left"]'), comparison.left)
  updateComparison(row.querySelector<HTMLElement>('[data-stat-value="right"]'), comparison.right)
}

function updateSummary(table: HTMLElement, summary: HTMLElement): void {
  const leftLabel = table.dataset['leftLabel'] ?? 'Left'
  const rightLabel = table.dataset['rightLabel'] ?? 'Right'
  let leftHigher = 0
  let rightHigher = 0
  let tied = 0

  for (const row of table.querySelectorAll<HTMLElement>('[data-stat-row]')) {
    const left = row.querySelector<HTMLInputElement>('input[data-stat-side="left"]')
    const right = row.querySelector<HTMLInputElement>('input[data-stat-side="right"]')
    if (!left || !right) continue

    const comparison = compareStatBonuses(left.value, right.value)
    if (comparison.left === 'empty') continue
    if (comparison.left === 'higher') {
      leftHigher += 1
    } else if (comparison.right === 'higher') {
      rightHigher += 1
    } else {
      tied += 1
    }
  }

  if (leftHigher + rightHigher + tied === 0) {
    summary.textContent = 'Enter bonuses for both sides to compare.'
    return
  }

  summary.textContent = `${leftLabel} higher in ${leftHigher}, ${rightLabel} higher in ${rightHigher}, tied in ${tied}.`
}

export function initStatBonuses(): void {
  const table = document.querySelector<HTMLElement>('[data-stat-bonuses]')
  if (!table) return
  const summary = document.getElementById('stat-bonuses-summary')

  table.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return
    if (!event.target.matches('input[data-stat-side]')) return

    const caret = event.target.selectionStart ?? event.target.value.length
    const edit = sanitizeStatBonusInput(event.target.value, caret)
    if (edit.value !== event.target.value) {
      event.target.value = edit.value
      event.target.setSelectionRange(edit.caret, edit.caret)
    }
    resizeInput(event.target)

    const row = event.target.closest<HTMLElement>('[data-stat-row]')
    if (row) updateRow(row)
  })

  table.addEventListener('focusout', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return
    if (!event.target.matches('input[data-stat-side]')) return

    const normalized = normalizeStatBonus(event.target.value)
    if (normalized !== event.target.value) {
      event.target.value = normalized
      const row = event.target.closest<HTMLElement>('[data-stat-row]')
      if (row) updateRow(row)
    }
    resizeInput(event.target)
  })

  table.addEventListener('change', () => {
    if (summary) updateSummary(table, summary)
  })

  for (const input of table.querySelectorAll<HTMLInputElement>('input[data-stat-side]')) {
    resizeInput(input)
  }
  for (const row of table.querySelectorAll<HTMLElement>('[data-stat-row]')) {
    updateRow(row)
  }
  if (summary) updateSummary(table, summary)
}
