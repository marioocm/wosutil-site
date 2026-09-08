import { clampInput, padInput } from '../timer'
import {
  marchPartsFromSec,
  marchSecFromParts,
  MAX_MINUTES,
  MAX_SECONDS,
} from '../rally-callers'

/**
 * Shared MM:SS duration input pair, used wherever a march time is entered:
 * the add form, the base march editor and the pet march editor.
 *
 * Look, limits and behavior match the countdown duration inputs: two numeric
 * fields joined by a colon that never wraps onto separate lines, clamping
 * live (MM 0-99, SS 0-59) and padding on blur.
 *
 * Sizing note: `small` inputs are `px-2 py-1` with a visible border, exactly
 * the same box as the march display buttons (`border-transparent`), so
 * swapping a button for its editor never changes the row height.
 */
const baseInputClass =
  'font-primary rounded-sm border border-hairline bg-canvas text-body-md text-ink [color-scheme:light] focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/25'
const fullInputClass = `${baseInputClass} w-20 px-3 py-2 text-center tabular-nums`
const smallInputClass = `${baseInputClass} w-16 shrink-0 px-2 py-1 text-center tabular-nums`

export interface DurationGroup {
  group: HTMLElement
  mm: HTMLInputElement
  ss: HTMLInputElement
}

function span(className: string, text: string): HTMLElement {
  const node = document.createElement('span')
  node.className = className
  node.textContent = text
  return node
}

export function buildDurationGroup(options: {
  initial: number | null
  minutesLabel: string
  secondsLabel: string
  minutesName: string
  secondsName: string
  focusKey?: string
  small?: boolean
}): DurationGroup {
  const group = document.createElement('div')
  group.className = 'flex shrink-0 items-center gap-2'
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', `${options.minutesLabel} / ${options.secondsLabel}`)
  const inputClass = options.small === true ? smallInputClass : fullInputClass
  const parts = marchPartsFromSec(options.initial)
  const mm = document.createElement('input')
  mm.type = 'number'
  mm.min = '0'
  mm.max = String(MAX_MINUTES)
  mm.inputMode = 'numeric'
  mm.placeholder = 'MM'
  mm.value = parts.minutes
  mm.name = options.minutesName
  mm.setAttribute('aria-label', options.minutesLabel)
  mm.autocomplete = 'off'
  mm.className = inputClass
  const ss = document.createElement('input')
  ss.type = 'number'
  ss.min = '0'
  ss.max = String(MAX_SECONDS)
  ss.inputMode = 'numeric'
  ss.placeholder = 'SS'
  ss.value = parts.seconds
  ss.name = options.secondsName
  ss.setAttribute('aria-label', options.secondsLabel)
  ss.autocomplete = 'off'
  ss.className = inputClass
  if (options.focusKey !== undefined) {
    mm.dataset['editFocus'] = options.focusKey
  }
  mm.addEventListener('input', () => {
    mm.value = clampInput(mm.value, MAX_MINUTES)
  })
  ss.addEventListener('input', () => {
    ss.value = clampInput(ss.value, MAX_SECONDS)
  })
  mm.addEventListener('blur', () => {
    mm.value = padInput(mm.value)
  })
  ss.addEventListener('blur', () => {
    ss.value = padInput(ss.value)
  })
  const sep = span('shrink-0 text-body-md text-ink-mute', ':')
  sep.setAttribute('aria-hidden', 'true')
  group.append(mm, sep, ss)
  return { group, mm, ss }
}

/** Enter commits, Escape cancels, leaving the group commits (deferred so a
 *  Tab between MM and SS never commits early). With `dismissable: false` an
 *  empty group stays open instead of committing. */
export function wireMarchEditor(options: {
  mm: HTMLInputElement
  ss: HTMLInputElement
  dismissable: boolean
  onCommit: (mm: string, ss: string) => void
  onCancel: () => void
}): void {
  const { mm, ss } = options
  let cancelled = false
  const commit = (): void => {
    if (!cancelled) options.onCommit(mm.value, ss.value)
  }
  for (const field of [mm, ss]) {
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
      } else if (event.key === 'Escape') {
        cancelled = true
        options.onCancel()
      }
    })
    field.addEventListener('blur', () => {
      if (cancelled) return
      // Defer so focus has settled: tabbing between MM and SS must not
      // commit, and a re-render that already committed detaches this editor.
      window.setTimeout(() => {
        if (cancelled) return
        const active = document.activeElement
        if (active === mm || active === ss) return
        if (!mm.isConnected || !ss.isConnected) return
        if (!options.dismissable && marchSecFromParts(mm.value, ss.value) === null) return
        commit()
      }, 0)
    })
  }
}
