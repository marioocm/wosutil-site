import { describe, expect, it } from 'vitest'
import {
  ENEMY_STORAGE_KEY,
  STORAGE_KEY,
  activatePet,
  PET_DURATION_MS,
} from './rally-callers'
import type { RallyCaller } from './rally-callers'
import { SELECTION_STORAGE_KEY } from './rally-selection'
import {
  applySharedState,
  buildShareHash,
  buildShareUrl,
  collectShareState,
  decodeShare,
  encodeShare,
  hasExistingState,
  parseShareFromHash,
} from './share'

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

describe('encode/decode round-trip', () => {
  it('round-trips rally, enemy and selection', () => {
    const payload = collectShareState(
      [makeCaller({ id: '1', name: 'Mario', baseMarchSec: 66 })],
      [makeCaller({ id: 'e1', name: 'Enemigo', baseMarchSec: 40 })],
      new Set(['1']),
    )
    expect(decodeShare(encodeShare(payload))).toEqual(payload)
  })

  it('supports unicode names (accents, emoji)', () => {
    const payload = collectShareState(
      [makeCaller({ id: '1', name: 'Álvaro ⚔️' })],
      [],
      new Set(['1']),
    )
    expect(decodeShare(encodeShare(payload))?.rally[0]?.name).toBe('Álvaro ⚔️')
  })

  it('produces URL-safe output (no +/= in hash)', () => {
    const payload = collectShareState([makeCaller({ name: '???' })], [], new Set())
    expect(encodeShare(payload)).not.toMatch(/[+/=]/)
  })
})

describe('decodeShare validation', () => {
  it('rejects garbage, wrong version and non-objects', () => {
    expect(decodeShare('')).toBeNull()
    expect(decodeShare('!!!not-base64!!!')).toBeNull()
    expect(decodeShare('Zg==')).toBeNull() // "f", valid b64url but not JSON
    expect(decodeShare(btoa(JSON.stringify({ v: 999, rally: [], enemy: [], sel: [] })).replace(/=+$/, ''))).toBeNull()
  })

  it('drops invalid caller entries but keeps valid ones', () => {
    const raw = btoa(
      JSON.stringify({ v: 1, rally: [{ id: 1 }, makeCaller({ id: 'ok' })], enemy: [], sel: ['ok', 42] }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const decoded = decodeShare(raw)
    expect(decoded?.rally.map((caller) => caller.id)).toEqual(['ok'])
    expect(decoded?.sel).toEqual(['ok'])
  })
})

describe('hash / url helpers', () => {
  it('builds and parses #s= hashes', () => {
    const payload = collectShareState([makeCaller({ id: '1' })], [], new Set(['1']))
    const hash = buildShareHash(payload)
    expect(hash.startsWith('#s=')).toBe(true)
    expect(parseShareFromHash(hash)).toEqual(payload)
    expect(parseShareFromHash(hash.slice(1))).toEqual(payload)
  })

  it('returns null for unrelated hashes', () => {
    expect(parseShareFromHash('')).toBeNull()
    expect(parseShareFromHash('#foo=bar')).toBeNull()
    expect(parseShareFromHash('#s=!!!')).toBeNull()
  })

  it('builds a share url from the current page dropping any old hash', () => {
    const payload = collectShareState([], [], new Set())
    expect(buildShareUrl('https://example.com/countdown/#old', payload)).toMatch(
      /^https:\/\/example\.com\/countdown\/#s=/,
    )
  })
})

describe('applySharedState', () => {
  it('writes rally, enemy and sanitized selection to storage', () => {
    const storage = memoryStorage()
    const now = 9_000_000
    applySharedState(
      storage,
      {
        v: 1,
        rally: [makeCaller({ id: '1' }), makeCaller({ id: '2' })],
        enemy: [makeCaller({ id: 'e1' })],
        sel: ['1', 'ghost'],
      },
      now,
    )
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(2)
    expect(JSON.parse(storage.getItem(ENEMY_STORAGE_KEY) ?? '[]')).toHaveLength(1)
    // Ghost ids (not in rally) are dropped; enemy ids never enter the selection.
    expect(JSON.parse(storage.getItem(SELECTION_STORAGE_KEY) ?? '[]')).toEqual(['1'])
  })

  it('purges expired pets on import (stale link)', () => {
    const storage = memoryStorage()
    const now = 9_000_000
    const expired = activatePet(makeCaller({ id: '1', petMarchSec: 30 }), now - PET_DURATION_MS - 1000)
    applySharedState(storage, { v: 1, rally: [expired], enemy: [], sel: [] }, now)
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]') as RallyCaller[]
    expect(saved[0]?.petActive).toBe(false)
    expect(saved[0]?.petExpiresAt).toBeNull()
    // Pet march time itself is kept for next activation.
    expect(saved[0]?.petMarchSec).toBe(30)
  })

  it('hasExistingState detects any stored list', () => {
    const empty = memoryStorage()
    expect(hasExistingState(empty)).toBe(false)
    empty.setItem(STORAGE_KEY, '[]')
    expect(hasExistingState(empty)).toBe(true)
  })
})
