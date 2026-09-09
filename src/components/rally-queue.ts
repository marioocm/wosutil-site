import { formatMarchSec } from '../rally-callers'
import type { RallyCaller } from '../rally-callers'
import {
  buildQueue,
  getDefaultDurationSec,
  getFlashingIds,
  getNewlyConsumedIds,
} from '../rally-selection'
import type { QueueEntry } from '../rally-selection'

const secondaryButtonClass =
  'font-primary cursor-pointer rounded-sm border border-hairline-strong bg-canvas px-3 py-2 text-center text-button-md font-medium text-ink transition-colors hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-40'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function mountRallyQueue(root: HTMLElement): {
  setSelected: (callers: RallyCaller[]) => void
  tick: (displaySeconds: number, running: boolean) => void
  restore: () => void
  onUseMax3: (listener: () => void) => void
} {
  let selected: RallyCaller[] = []
  let consumed = new Set<string>()
  let lastKey = ''
  const max3Listeners = new Set<() => void>()

  const header = el('div', 'flex items-center justify-between gap-2')
  const title = el('h2', 'text-body-md font-medium text-ink', 'Up next')
  const max3Button = document.createElement('button')
  max3Button.type = 'button'
  max3Button.id = 'rally-max3'
  max3Button.textContent = 'Set Max +3s'
  max3Button.className = `${secondaryButtonClass} shrink-0 px-2 py-1 text-caption`
  max3Button.addEventListener('click', () => {
    for (const listener of max3Listeners) listener()
  })

  header.append(title, max3Button)

  const list = document.createElement('ul')
  list.id = 'rally-queue-list'
  list.className = 'flex flex-col gap-2'
  list.setAttribute('aria-label', 'Call queue')

  const empty = el('p', 'text-caption text-ink-mute', 'Select rally callers to build the queue.')
  empty.id = 'rally-queue-empty'
  empty.setAttribute('role', 'status')

  const live = el('p', 'sr-only')
  live.id = 'rally-queue-live'
  live.setAttribute('aria-live', 'polite')

  root.append(header, list, empty, live)

  function pending(): QueueEntry[] {
    return buildQueue(selected).filter((entry) => !consumed.has(entry.id))
  }

  function render(): void {
    const rows = pending()
    const defaultSec = getDefaultDurationSec(selected)
    max3Button.disabled = selected.length === 0
    max3Button.title =
      defaultSec === null ? 'Select rally callers first' : `Set timer to ${formatMarchSec(defaultSec)}`

    list.textContent = ''
    if (rows.length === 0) {
      empty.style.display = ''
      empty.textContent =
        selected.length === 0
          ? 'Select rally callers to build the queue.'
          : 'All calls done.'
    } else {
      empty.style.display = 'none'
    }

    for (const entry of rows) {
      list.append(renderRow(entry, false))
    }
    lastKey = key(rows, [])
    live.textContent = ''
  }

  function renderRow(entry: QueueEntry, flashing: boolean): HTMLElement {
    const item = document.createElement('li')
    item.className = flashing
      ? 'flex items-center justify-between gap-2 rounded-md border border-primary-deep bg-primary px-3 py-2 font-medium text-on-primary shadow-sm transition-all -translate-y-px'
      : 'flex items-center justify-between gap-2 rounded-md border border-hairline bg-canvas px-3 py-2 transition-all'
    item.dataset['queueId'] = entry.id
    if (flashing) {
      item.dataset['flashing'] = 'true'
      item.setAttribute('aria-current', 'true')
    }
    const name = el('span', 'min-w-0 flex-1 truncate text-body-md', entry.name)
    const time = el(
      'span',
      'shrink-0 text-body-md tabular-nums',
      formatMarchSec(entry.callAtSec),
    )
    item.append(name, time)
    return item
  }

  function key(rows: QueueEntry[], flashing: string[]): string {
    return `${rows.map((entry) => entry.id).join(',')}|${flashing.join(',')}`
  }

  return {
    setSelected(callers: RallyCaller[]): void {
      selected = [...callers]
      consumed = new Set([...consumed].filter((id) => selected.some((c) => c.id === id)))
      render()
    },
    tick(displaySeconds: number, running: boolean): void {
      const rows = pending()
      const flashing = getFlashingIds(rows, displaySeconds, running)
      const newly = getNewlyConsumedIds(rows, displaySeconds, running)
      if (newly.length > 0) {
        consumed = new Set([...consumed, ...newly])
        render()
        const names = rows
          .filter((entry) => flashing.includes(entry.id))
          .map((entry) => entry.name)
        if (names.length > 0) live.textContent = `${names.join(', ')} — call now`
        return
      }
      if (key(rows, flashing) === lastKey) return
      list.textContent = ''
      for (const entry of rows) {
        list.append(renderRow(entry, flashing.includes(entry.id)))
      }
      lastKey = key(rows, flashing)
      const names = rows.filter((entry) => flashing.includes(entry.id)).map((e) => e.name)
      live.textContent = names.length > 0 ? `${names.join(', ')} — call now` : ''
    },
    restore(): void {
      if (consumed.size === 0) return
      consumed = new Set()
      render()
    },
    onUseMax3(listener: () => void): void {
      max3Listeners.add(listener)
    },
  }
}
