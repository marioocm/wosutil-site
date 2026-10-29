import { describe, expect, it } from 'vitest'
import {
  buildQueue,
  formatCallTargetUtc,
  getBufferDurationSec,
  getDefaultDurationSec,
  getFlashingIds,
  getMaxMarchSec,
  getNewlyConsumedIds,
  getSelectedCallers,
  isSelectable,
  loadSelection,
  parseSelection,
  sanitizeSelection,
  saveSelection,
  serializeSelection,
  toggleSelection,
} from './rally-selection'
import type { RallyCaller } from './rally-callers'

function makeCaller(overrides: Partial<RallyCaller> = {}): RallyCaller {
  return {
    id: overrides.id ?? `id-${Math.random().toString(36).slice(2)}`,
    name: overrides.name ?? 'Mario',
    baseMarchSec: 'baseMarchSec' in overrides ? overrides.baseMarchSec ?? null : 65,
    petActive: overrides.petActive ?? false,
    petMarchSec: 'petMarchSec' in overrides ? overrides.petMarchSec ?? null : null,
    petExpiresAt: 'petExpiresAt' in overrides ? overrides.petExpiresAt ?? null : null,
  }
}

function memoryStorage(initial = ''): Storage {
  let value = initial
  return {
    get length() {
      return value === '' ? 0 : 1
    },
    clear: () => {
      value = ''
    },
    getItem: () => (value === '' ? null : value),
    key: () => null,
    removeItem: () => {
      value = ''
    },
    setItem: (_key: string, next: string) => {
      value = next
    },
  }
}

describe('isSelectable', () => {
  it('requires an effective march time', () => {
    expect(isSelectable(makeCaller({ baseMarchSec: 65 }))).toBe(true)
    expect(isSelectable(makeCaller({ baseMarchSec: null }))).toBe(false)
  })

  it('uses the pet march while active', () => {
    const caller = makeCaller({ baseMarchSec: 65, petActive: true, petMarchSec: 39 })
    expect(isSelectable(caller)).toBe(true)
  })
})

describe('toggleSelection', () => {
  it('adds a missing id and removes a present one', () => {
    expect([...toggleSelection(new Set(), 'a')]).toEqual(['a'])
    expect([...toggleSelection(new Set(['a']), 'a')]).toEqual([])
  })

  it('does not mutate the input set', () => {
    const input = new Set(['a'])
    toggleSelection(input, 'b')
    expect([...input]).toEqual(['a'])
  })
})

describe('getSelectedCallers', () => {
  it('keeps only existing selectable callers', () => {
    const list = [
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '2', name: 'Pedro', baseMarchSec: 38 }),
      makeCaller({ id: '3', name: 'SinMarch', baseMarchSec: null }),
    ]
    const selected = getSelectedCallers(list, new Set(['1', '2', '3', 'ghost']))
    expect(selected.map((caller) => caller.id).sort()).toEqual(['1', '2'])
  })
})

describe('max march + buffer', () => {
  it('returns the max effective march', () => {
    const list = [
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '2', name: 'Pedro', baseMarchSec: 38 }),
    ]
    expect(getMaxMarchSec(list)).toBe(66)
  })

  it('adds 3s buffer for the default duration (66 + 38 -> 69)', () => {
    const list = [
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '2', name: 'Pedro', baseMarchSec: 38 }),
    ]
    expect(getDefaultDurationSec(list)).toBe(69)
  })

  it('uses the pet march as effective value while active', () => {
    const list = [makeCaller({ baseMarchSec: 90, petActive: true, petMarchSec: 30 })]
    expect(getMaxMarchSec(list)).toBe(30)
    expect(getDefaultDurationSec(list)).toBe(33)
  })

  it('returns null when empty or without march', () => {
    expect(getMaxMarchSec([])).toBeNull()
    expect(getDefaultDurationSec([])).toBeNull()
    expect(getMaxMarchSec([makeCaller({ baseMarchSec: null })])).toBeNull()
  })

  it('supports custom buffers (66 + 20 -> 86)', () => {
    const list = [
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '2', name: 'Pedro', baseMarchSec: 38 }),
    ]
    expect(getBufferDurationSec(list, 20)).toBe(86)
    expect(getBufferDurationSec(list, 3)).toBe(69)
    expect(getBufferDurationSec([], 20)).toBeNull()
  })
})

describe('buildQueue', () => {
  it('sorts descending with name tiebreak (mayor arriba)', () => {
    const list = [
      makeCaller({ id: '1', name: 'Pedro', baseMarchSec: 38 }),
      makeCaller({ id: '2', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '3', name: 'Ana', baseMarchSec: 66 }),
    ]
    expect(buildQueue(list).map((entry) => entry.name)).toEqual(['Ana', 'Mario', 'Pedro'])
    expect(buildQueue(list).map((entry) => entry.callAtSec)).toEqual([66, 66, 38])
  })

  it('skips callers without march', () => {
    const list = [
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '2', name: 'SinMarch', baseMarchSec: null }),
    ]
    expect(buildQueue(list).map((entry) => entry.id)).toEqual(['1'])
  })
})

describe('formatCallTargetUtc', () => {
  it('formats endTime minus march as HH:MM:SS UTC', () => {
    // Now 12:00:00, 40s remaining, march 25 → call at 12:00:15.
    const now = Date.UTC(2026, 8, 9, 12, 0, 0)
    expect(formatCallTargetUtc(now + 40_000, 25)).toBe('12:00:15 UTC')
  })

  it('rolls over midnight correctly', () => {
    const now = Date.UTC(2026, 8, 9, 23, 59, 50)
    expect(formatCallTargetUtc(now + 40_000, 25)).toBe('00:00:05 UTC')
  })
})

describe('flash and consume', () => {
  it('flashes only on the exact second while running', () => {
    const queue = buildQueue([
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '2', name: 'Pedro', baseMarchSec: 38 }),
    ])
    expect(getFlashingIds(queue, 66, true)).toEqual(['1'])
    expect(getFlashingIds(queue, 65, true)).toEqual([])
    expect(getFlashingIds(queue, 66, false)).toEqual([])
  })

  it('consumes only while running once the display drops below callAt', () => {
    const queue = buildQueue([
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 }),
      makeCaller({ id: '2', name: 'Pedro', baseMarchSec: 38 }),
    ])
    expect(getNewlyConsumedIds(queue, 66, true)).toEqual([])
    expect(getNewlyConsumedIds(queue, 65, true)).toEqual(['1'])
    expect(getNewlyConsumedIds(queue, 65, false)).toEqual([])
    expect(getNewlyConsumedIds(queue, 37, true).sort()).toEqual(['1', '2'])
  })
})

describe('selection storage', () => {
  it('round-trips through serialize/parse', () => {
    const selection = new Set(['1', '2'])
    expect(parseSelection(serializeSelection(selection))).toEqual(['1', '2'])
  })

  it('returns empty for corrupt or missing data', () => {
    expect(parseSelection(null)).toEqual([])
    expect(parseSelection('not-json')).toEqual([])
    expect(parseSelection('{"x":1}')).toEqual([])
    expect(parseSelection(JSON.stringify([1, null]))).toEqual([])
  })

  it('sanitizes to existing ids', () => {
    const list = [makeCaller({ id: '1' })]
    expect([...sanitizeSelection(new Set(['1', 'ghost']), list)]).toEqual(['1'])
  })

  it('loadSelection reads storage and saveSelection writes without throwing', () => {
    const storage = memoryStorage(serializeSelection(new Set(['1'])))
    expect([...loadSelection(storage)]).toEqual(['1'])
    const empty = memoryStorage()
    expect([...loadSelection(empty)]).toEqual([])
    expect(() => saveSelection(memoryStorage(), new Set(['1']))).not.toThrow()
  })
})
