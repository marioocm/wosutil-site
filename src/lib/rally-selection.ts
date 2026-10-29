import { getEffectiveMarchSec } from './rally-callers'
import type { RallyCaller } from './rally-callers'
import { formatUtcClock } from './timer'

export const SELECTION_STORAGE_KEY = 'wosutil:rally-selection:v1'
export const QUEUE_BUFFER_SEC = 3

export interface QueueEntry {
  id: string
  name: string
  callAtSec: number
}

export function isSelectable(caller: RallyCaller): boolean {
  return getEffectiveMarchSec(caller) !== null
}

export function toggleSelection(selection: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selection)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

export function getSelectedCallers(
  list: RallyCaller[],
  selection: ReadonlySet<string>,
): RallyCaller[] {
  return list.filter((caller) => selection.has(caller.id) && isSelectable(caller))
}

export function getMaxMarchSec(selected: RallyCaller[]): number | null {
  let max: number | null = null
  for (const caller of selected) {
    const effective = getEffectiveMarchSec(caller)
    if (effective === null) continue
    if (max === null || effective > max) max = effective
  }
  return max
}

export function getDefaultDurationSec(selected: RallyCaller[]): number | null {
  return getBufferDurationSec(selected, QUEUE_BUFFER_SEC)
}

export function getBufferDurationSec(
  selected: RallyCaller[],
  bufferSec: number,
): number | null {
  const max = getMaxMarchSec(selected)
  return max === null ? null : max + bufferSec
}

export function formatCallTargetUtc(endTimeMs: number, callAtSec: number): string {
  return `${formatUtcClock(new Date(endTimeMs - callAtSec * 1000))} UTC`
}

export function buildQueue(selected: RallyCaller[]): QueueEntry[] {
  return selected
    .map((caller) => {
      const effective = getEffectiveMarchSec(caller)
      return effective === null
        ? null
        : { id: caller.id, name: caller.name, callAtSec: effective }
    })
    .filter((entry): entry is QueueEntry => entry !== null)
    .sort((a, b) => {
      if (a.callAtSec !== b.callAtSec) return b.callAtSec - a.callAtSec
      return a.name.localeCompare(b.name)
    })
}

export function getFlashingIds(
  queue: QueueEntry[],
  displaySeconds: number,
  running: boolean,
): string[] {
  if (!running) return []
  return queue.filter((entry) => entry.callAtSec === displaySeconds).map((entry) => entry.id)
}

export function getNewlyConsumedIds(
  queue: QueueEntry[],
  displaySeconds: number,
  running: boolean,
): string[] {
  if (!running) return []
  return queue
    .filter((entry) => entry.callAtSec > displaySeconds)
    .map((entry) => entry.id)
}

export function parseSelection(json: string | null): string[] {
  if (!json) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

export function serializeSelection(selection: ReadonlySet<string>): string {
  return JSON.stringify([...selection])
}

export function sanitizeSelection(
  selection: ReadonlySet<string>,
  list: RallyCaller[],
): Set<string> {
  const valid = new Set(list.map((caller) => caller.id))
  return new Set([...selection].filter((id) => valid.has(id)))
}

export function loadSelection(
  storage: Pick<Storage, 'getItem'>,
  key: string = SELECTION_STORAGE_KEY,
): Set<string> {
  try {
    return new Set(parseSelection(storage.getItem(key)))
  } catch {
    return new Set()
  }
}

export function saveSelection(
  storage: Pick<Storage, 'setItem'>,
  selection: ReadonlySet<string>,
  key: string = SELECTION_STORAGE_KEY,
): void {
  try {
    storage.setItem(key, serializeSelection(selection))
  } catch {
    // Storage full or unavailable: keep in-memory state, skip persistence.
  }
}
