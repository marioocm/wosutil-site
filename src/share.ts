import {
  ENEMY_STORAGE_KEY,
  STORAGE_KEY,
  parseCallers,
  purgeExpired,
  saveCallers,
} from './rally-callers'
import type { RallyCaller } from './rally-callers'
import {
  SELECTION_STORAGE_KEY,
  parseSelection,
  saveSelection,
} from './rally-selection'

export const SHARE_VERSION = 1
export const SHARE_HASH_PARAM = 's'

export interface SharePayload {
  v: number
  rally: RallyCaller[]
  enemy: RallyCaller[]
  sel: string[]
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(input: string): Uint8Array | null {
  if (input === '' || /[^A-Za-z0-9\-_]/.test(input)) return null
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding === 1) return null
  if (padding !== 0) base64 += '='.repeat(4 - padding)
  let binary: string
  try {
    binary = atob(base64)
  } catch {
    return null
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function encodeShare(payload: SharePayload): string {
  const json = JSON.stringify({ v: SHARE_VERSION, rally: payload.rally, enemy: payload.enemy, sel: payload.sel })
  return bytesToBase64Url(new TextEncoder().encode(json))
}

export function decodeShare(encoded: string): SharePayload | null {
  const bytes = base64UrlToBytes(encoded)
  if (!bytes) return null
  let json: string
  try {
    json = new TextDecoder().decode(bytes)
  } catch {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Record<string, unknown>
  if (record['v'] !== SHARE_VERSION) return null
  if (!Array.isArray(record['rally']) || !Array.isArray(record['enemy'])) return null
  if (!Array.isArray(record['sel'])) return null
  // Reuse the storage validators so a crafted link can never inject junk.
  const rally = parseCallers(JSON.stringify(record['rally']))
  const enemy = parseCallers(JSON.stringify(record['enemy']))
  const sel = parseSelection(JSON.stringify(record['sel']))
  return { v: SHARE_VERSION, rally, enemy, sel }
}

export function buildShareHash(payload: SharePayload): string {
  return `#${SHARE_HASH_PARAM}=${encodeShare(payload)}`
}

export function buildShareUrl(baseUrl: string, payload: SharePayload): string {
  return `${baseUrl.split('#')[0]}${buildShareHash(payload)}`
}

export function parseShareFromHash(hash: string): SharePayload | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  const prefix = `${SHARE_HASH_PARAM}=`
  if (!fragment.startsWith(prefix)) return null
  return decodeShare(fragment.slice(prefix.length))
}

export function collectShareState(
  rally: RallyCaller[],
  enemy: RallyCaller[],
  selection: ReadonlySet<string>,
): SharePayload {
  return { v: SHARE_VERSION, rally: [...rally], enemy: [...enemy], sel: [...selection] }
}

export function hasExistingState(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return (
      storage.getItem(STORAGE_KEY) !== null ||
      storage.getItem(ENEMY_STORAGE_KEY) !== null ||
      storage.getItem(SELECTION_STORAGE_KEY) !== null
    )
  } catch {
    return false
  }
}

export function applySharedState(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  payload: SharePayload,
  now: number,
): void {
  const rally = purgeExpired(payload.rally, now)
  const enemy = purgeExpired(payload.enemy, now)
  const validIds = new Set(rally.map((caller) => caller.id))
  const sel = new Set(payload.sel.filter((id) => validIds.has(id)))
  saveCallers(storage, rally, STORAGE_KEY)
  saveCallers(storage, enemy, ENEMY_STORAGE_KEY)
  saveSelection(storage, sel, SELECTION_STORAGE_KEY)
}
