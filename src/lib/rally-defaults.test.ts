import { describe, expect, it } from 'vitest'
import {
  ENEMY_STORAGE_KEY,
  STORAGE_KEY,
  getEffectiveMarchSec,
  loadCallers,
} from './rally-callers'
import {
  buildDefaultRallyCallers,
  DEFAULT_SELECTION_IDS,
  seedCountdownDefaults,
} from './rally-defaults'
import {
  SELECTION_STORAGE_KEY,
  getBufferDurationSec,
  getSelectedCallers,
  loadSelection,
} from './rally-selection'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => {
      values.clear()
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => {
      values.delete(key)
    },
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('seedCountdownDefaults', () => {
  it('seeds four rally callers, an empty enemy list and three selected callers', () => {
    const storage = memoryStorage()
    const seeded = seedCountdownDefaults(storage, 1_000)

    expect(seeded).toBe(true)
    const rally = loadCallers(storage, 1_000)
    expect(rally.map((caller) => caller.name)).toEqual([
      'Player 1',
      'Example 33',
      'Jo',
      'Fernando Alonso',
    ])
    expect(loadCallers(storage, 1_000, ENEMY_STORAGE_KEY)).toEqual([])
    expect([...loadSelection(storage)].sort()).toEqual([...DEFAULT_SELECTION_IDS].sort())
  })

  it('keeps the selected callers distinct, within 40s-1:18 and with one pet active', () => {
    const callers = buildDefaultRallyCallers(1_000)
    const selected = getSelectedCallers(callers, new Set(DEFAULT_SELECTION_IDS))
    const times = selected.map((caller) => getEffectiveMarchSec(caller) ?? 0)

    expect(selected).toHaveLength(3)
    expect(new Set(times).size).toBe(3)
    for (const time of times) {
      expect(time).toBeGreaterThanOrEqual(40)
      expect(time).toBeLessThanOrEqual(78)
    }
    expect(selected.filter((caller) => caller.petActive)).toHaveLength(1)
    expect(getBufferDurationSec(selected, 3)).toBe(81)
  })

  it('does not overwrite existing state', () => {
    for (const key of [STORAGE_KEY, ENEMY_STORAGE_KEY, SELECTION_STORAGE_KEY]) {
      const storage = memoryStorage()
      storage.setItem(key, '[]')

      expect(seedCountdownDefaults(storage, 1_000)).toBe(false)
      expect(storage.getItem(key)).toBe('[]')
      expect(storage.getItem(STORAGE_KEY)).toBe(key === STORAGE_KEY ? '[]' : null)
      expect(storage.getItem(ENEMY_STORAGE_KEY)).toBe(key === ENEMY_STORAGE_KEY ? '[]' : null)
      expect(storage.getItem(SELECTION_STORAGE_KEY)).toBe(
        key === SELECTION_STORAGE_KEY ? '[]' : null,
      )
    }
  })
})
