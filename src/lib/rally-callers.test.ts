import { describe, expect, it } from 'vitest'
import {
  activatePet,
  createId,
  deactivatePet,
  formatMarchSec,
  formatPetRemaining,
  getEffectiveMarchSec,
  getPetRemainingMs,
  isNameTaken,
  isPetExpired,
  loadCallers,
  marchSecFromParts,
  parseCallers,
  PET_DURATION_MS,
  purgeExpired,
  saveCallers,
  serializeCallers,
  sortCallers,
  validateCallerName,
  validatePetMarch,
} from './rally-callers'
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

describe('validateCallerName', () => {
  it('requires a non-empty name', () => {
    expect(validateCallerName([], '')).toBe('Name is required')
    expect(validateCallerName([], '   ')).toBe('Name is required')
  })

  it('rejects duplicate names case-insensitively', () => {
    const list = [makeCaller({ id: '1', name: 'Mario' })]
    expect(validateCallerName(list, 'mario')).toBe('Name already exists')
    expect(validateCallerName(list, '  MARIO  ')).toBe('Name already exists')
  })

  it('allows renaming the same caller keeping its name', () => {
    const list = [makeCaller({ id: '1', name: 'Mario' })]
    expect(validateCallerName(list, 'Mario', '1')).toBeNull()
  })

  it('accepts a unique name', () => {
    const list = [makeCaller({ id: '1', name: 'Mario' })]
    expect(validateCallerName(list, 'Ana')).toBeNull()
  })
})

describe('isNameTaken', () => {
  it('ignores the excluded id', () => {
    const list = [makeCaller({ id: '1', name: 'Mario' })]
    expect(isNameTaken(list, 'Mario', '1')).toBe(false)
    expect(isNameTaken(list, 'Mario', '2')).toBe(true)
  })
})

describe('marchSecFromParts', () => {
  it('returns null when both parts are empty (optional march)', () => {
    expect(marchSecFromParts('', '')).toBeNull()
    expect(marchSecFromParts('  ', '')).toBeNull()
  })

  it('combines minutes and seconds', () => {
    expect(marchSecFromParts('1', '05')).toBe(65)
    expect(marchSecFromParts('', '35')).toBe(35)
    expect(marchSecFromParts('2', '')).toBe(120)
  })

  it('clamps out-of-range values', () => {
    expect(marchSecFromParts('999', '99')).toBe(99 * 60 + 59)
  })
})

describe('formatMarchSec', () => {
  it('formats null as an em dash placeholder', () => {
    expect(formatMarchSec(null)).toBe('—')
  })

  it('formats seconds as MM:SS', () => {
    expect(formatMarchSec(65)).toBe('01:05')
    expect(formatMarchSec(35)).toBe('00:35')
  })
})

describe('validatePetMarch', () => {
  it('requires pet march to be lower than base when both exist', () => {
    expect(validatePetMarch(65, 65)).toBe('Pet march must be lower than base')
    expect(validatePetMarch(65, 80)).toBe('Pet march must be lower than base')
    expect(validatePetMarch(65, 39)).toBeNull()
  })

  it('allows empty pet or empty base (nothing to compare)', () => {
    expect(validatePetMarch(65, null)).toBeNull()
    expect(validatePetMarch(null, 39)).toBeNull()
    expect(validatePetMarch(null, null)).toBeNull()
  })
})

describe('getEffectiveMarchSec', () => {
  it('returns the base march when pets are off', () => {
    expect(getEffectiveMarchSec(makeCaller({ baseMarchSec: 65 }))).toBe(65)
  })

  it('returns the pet march when pets are on', () => {
    const caller = makeCaller({ baseMarchSec: 65, petActive: true, petMarchSec: 39 })
    expect(getEffectiveMarchSec(caller)).toBe(39)
  })

  it('falls back to base when pets are on but pet march is empty', () => {
    const caller = makeCaller({ baseMarchSec: 65, petActive: true, petMarchSec: null })
    expect(getEffectiveMarchSec(caller)).toBe(65)
  })
})

describe('pet expiry', () => {
  it('activates pets for exactly 2 hours', () => {
    const now = 1_000_000
    const active = activatePet(makeCaller(), now)
    expect(active.petActive).toBe(true)
    expect(active.petExpiresAt).toBe(now + PET_DURATION_MS)
    expect(PET_DURATION_MS).toBe(2 * 60 * 60 * 1000)
  })

  it('computes remaining time and detects expiry by real time', () => {
    const now = 1_000_000
    const active = activatePet(makeCaller(), now)
    expect(getPetRemainingMs(active, now + 1000)).toBe(PET_DURATION_MS - 1000)
    expect(isPetExpired(active, now)).toBe(false)
    expect(isPetExpired(active, now + PET_DURATION_MS)).toBe(true)
    expect(isPetExpired(active, now + PET_DURATION_MS + 1)).toBe(true)
  })

  it('deactivating keeps the pet march for next time', () => {
    const active = activatePet(makeCaller({ petMarchSec: 39 }), 1000)
    const off = deactivatePet(active)
    expect(off.petActive).toBe(false)
    expect(off.petExpiresAt).toBeNull()
    expect(off.petMarchSec).toBe(39)
  })

  it('purges expired callers restoring the base state', () => {
    const now = 5_000_000
    const expired = activatePet(makeCaller({ id: '1', petMarchSec: 39 }), now - PET_DURATION_MS - 1)
    const fresh = activatePet(makeCaller({ id: '2', petMarchSec: 40 }), now)
    const result = purgeExpired([expired, fresh], now)
    expect(result[0]?.petActive).toBe(false)
    expect(result[0]?.petExpiresAt).toBeNull()
    expect(result[1]?.petActive).toBe(true)
  })
})

describe('formatPetRemaining', () => {
  it('formats milliseconds as HH:MM:SS', () => {
    expect(formatPetRemaining(2 * 60 * 60 * 1000)).toBe('02:00:00')
    expect(formatPetRemaining((1 * 3600 + 42 * 60 + 10) * 1000)).toBe('01:42:10')
    expect(formatPetRemaining(0)).toBe('00:00:00')
  })
})

describe('sortCallers', () => {
  it('sorts by effective march ascending with nulls last', () => {
    const list = [
      makeCaller({ id: '1', name: 'Slow', baseMarchSec: 90 }),
      makeCaller({ id: '2', name: 'Fast', baseMarchSec: 35 }),
      makeCaller({ id: '3', name: 'Unknown', baseMarchSec: null }),
    ]
    expect(sortCallers(list).map((caller) => caller.name)).toEqual([
      'Fast',
      'Slow',
      'Unknown',
    ])
  })

  it('uses the pet march as effective value while active', () => {
    const list = [
      makeCaller({ id: '1', name: 'Mario', baseMarchSec: 90, petActive: true, petMarchSec: 30 }),
      makeCaller({ id: '2', name: 'Ana', baseMarchSec: 47 }),
    ]
    expect(sortCallers(list).map((caller) => caller.name)).toEqual(['Mario', 'Ana'])
  })

  it('breaks ties by name', () => {
    const list = [
      makeCaller({ id: '1', name: 'Zoe', baseMarchSec: 40 }),
      makeCaller({ id: '2', name: 'Ana', baseMarchSec: 40 }),
    ]
    expect(sortCallers(list).map((caller) => caller.name)).toEqual(['Ana', 'Zoe'])
  })
})

describe('storage', () => {
  it('round-trips through serialize/parse', () => {
    const list = [makeCaller({ id: '1', name: 'Mario' })]
    expect(parseCallers(serializeCallers(list))).toEqual(list)
  })

  it('returns empty for corrupt or missing data', () => {
    expect(parseCallers(null)).toEqual([])
    expect(parseCallers('not-json')).toEqual([])
    expect(parseCallers('{"x":1}')).toEqual([])
  })

  it('drops invalid entries', () => {
    const valid = makeCaller({ id: '1' })
    expect(parseCallers(JSON.stringify([valid, { id: 1 }]))).toEqual([valid])
  })

  it('loadCallers purges expired pets (survives reload after 2h)', () => {
    const now = 9_000_000
    const expired = activatePet(makeCaller({ id: '1' }), now - PET_DURATION_MS - 5000)
    const storage = memoryStorage(serializeCallers([expired]))
    const loaded = loadCallers(storage, now)
    expect(loaded[0]?.petActive).toBe(false)
  })

  it('saveCallers writes JSON without throwing', () => {
    const storage = memoryStorage()
    expect(() => saveCallers(storage, [makeCaller()])).not.toThrow()
    expect(parseCallers(storage.getItem('k'))).toHaveLength(1)
  })
})

describe('createId', () => {
  it('generates unique ids', () => {
    expect(createId()).not.toBe(createId())
  })
})
