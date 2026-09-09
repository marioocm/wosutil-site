import { formatMarchSec } from '../rally-callers'
import type { RallyCaller } from '../rally-callers'
import {
  buildQueue,
  getBufferDurationSec,
  getFlashingIds,
  getNewlyConsumedIds,
} from '../rally-selection'
import type { QueueEntry } from '../rally-selection'

export const QUEUE_BUFFERS = [3, 20] as const

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
  onApplyBuffer: (listener: (bufferSec: number) => void) => void
} {
  let selected: RallyCaller[] = []
  let consumed = new Set<string>()
  let lastKey = ''
  const bufferListeners = new Set<(bufferSec: number) => void>()

  const header = el('div', 'flex items-center justify-between gap-2')
  const title = el('h2', 'text-body-md font-medium text-ink', 'Up next')
  const bufferGroup = el('div', 'flex shrink-0 items-center gap-2')
  const bufferButtons = QUEUE_BUFFERS.map((bufferSec) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = `rally-max${bufferSec}`
    button.textContent = `Set Max +${bufferSec}s`
    button.className = `${secondaryButtonClass} shrink-0 px-2 py-1 text-caption`
    button.addEventListener('click', () => {
      for (const listener of bufferListeners) listener(bufferSec)
    })
    bufferGroup.append(button)
    return { bufferSec, button }
  })

  header.append(title, bufferGroup)

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
    for (const { bufferSec, button } of bufferButtons) {
      const target = getBufferDurationSec(selected, bufferSec)
      button.disabled = selected.length === 0
      button.title =
        target === null ? 'Select rally callers first' : `Set timer to ${formatMarchSec(target)}`
    }

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
    onApplyBuffer(listener: (bufferSec: number) => void): void {
      bufferListeners.add(listener)
    },
  }
}
