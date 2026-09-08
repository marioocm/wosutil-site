import { clamp, pad2, parseSecondsInput, splitSeconds } from './timer'

export const PET_DURATION_MS = 2 * 60 * 60 * 1000
export const STORAGE_KEY = 'wosutil:rally-callers:v1'
export const MAX_MINUTES = 99
export const MAX_SECONDS = 59

export interface RallyCaller {
  id: string
  name: string
  baseMarchSec: number | null
  petActive: boolean
  petMarchSec: number | null
  petExpiresAt: number | null
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

export function normalizeName(name: string): string {
  return name.trim()
}

export function isNameTaken(list: RallyCaller[], name: string, excludeId?: string): boolean {
  const normalized = normalizeName(name).toLowerCase()
  if (normalized === '') return false
  return list.some(
    (caller) => caller.id !== excludeId && caller.name.trim().toLowerCase() === normalized,
  )
}

export function validateCallerName(
  list: RallyCaller[],
  name: string,
  excludeId?: string,
): string | null {
  if (normalizeName(name) === '') return 'Name is required'
  if (isNameTaken(list, name, excludeId)) return 'Name already exists'
  return null
}

export function marchSecFromParts(minutesRaw: string, secondsRaw: string): number | null {
  if (minutesRaw.trim() === '' && secondsRaw.trim() === '') return null
  const minutes = clamp(parseSecondsInput(minutesRaw), 0, MAX_MINUTES)
  const seconds = clamp(parseSecondsInput(secondsRaw), 0, MAX_SECONDS)
  return minutes * 60 + seconds
}

export function marchPartsFromSec(totalSeconds: number | null): { minutes: string; seconds: string } {
  if (totalSeconds === null) return { minutes: '', seconds: '' }
  const { minutes, seconds } = splitSeconds(totalSeconds)
  return { minutes: minutes.toString(), seconds: pad2(seconds) }
}

export function formatMarchSec(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—'
  const { minutes, seconds } = splitSeconds(totalSeconds)
  return `${pad2(minutes)}:${pad2(seconds)}`
}

export function validatePetMarch(
  baseMarchSec: number | null,
  petMarchSec: number | null,
): string | null {
  if (petMarchSec === null) return null
  if (baseMarchSec === null) return null
  if (petMarchSec < baseMarchSec) return null
  return 'Pet march must be lower than base'
}

export function getEffectiveMarchSec(caller: RallyCaller): number | null {
  if (caller.petActive && caller.petMarchSec !== null) return caller.petMarchSec
  return caller.baseMarchSec
}

export function getPetRemainingMs(caller: RallyCaller, now: number): number {
  if (!caller.petActive || caller.petExpiresAt === null) return 0
  return Math.max(0, caller.petExpiresAt - now)
}

export function isPetExpired(caller: RallyCaller, now: number): boolean {
  return (
    caller.petActive && caller.petExpiresAt !== null && caller.petExpiresAt <= now
  )
}

export function formatPetRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

export function activatePet(caller: RallyCaller, now: number): RallyCaller {
  return { ...caller, petActive: true, petExpiresAt: now + PET_DURATION_MS }
}

export function deactivatePet(caller: RallyCaller): RallyCaller {
  return { ...caller, petActive: false, petExpiresAt: null }
}

export function purgeExpired(list: RallyCaller[], now: number): RallyCaller[] {
  return list.map((caller) => (isPetExpired(caller, now) ? deactivatePet(caller) : caller))
}

export function sortCallers(list: RallyCaller[]): RallyCaller[] {
  return [...list].sort((a, b) => {
    const effectiveA = getEffectiveMarchSec(a)
    const effectiveB = getEffectiveMarchSec(b)
    if (effectiveA === null && effectiveB === null) {
      return a.name.localeCompare(b.name)
    }
    if (effectiveA === null) return 1
    if (effectiveB === null) return -1
    if (effectiveA !== effectiveB) return effectiveA - effectiveB
    return a.name.localeCompare(b.name)
  })
}

function isValidCaller(value: unknown): value is RallyCaller {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record['id'] === 'string' &&
    typeof record['name'] === 'string' &&
    (typeof record['baseMarchSec'] === 'number' || record['baseMarchSec'] === null) &&
    typeof record['petActive'] === 'boolean' &&
    (typeof record['petMarchSec'] === 'number' || record['petMarchSec'] === null) &&
    (typeof record['petExpiresAt'] === 'number' || record['petExpiresAt'] === null)
  )
}

export function parseCallers(json: string | null): RallyCaller[] {
  if (!json) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidCaller)
  } catch {
    return []
  }
}

export function serializeCallers(list: RallyCaller[]): string {
  return JSON.stringify(list)
}

export function loadCallers(storage: Pick<Storage, 'getItem'>, now: number): RallyCaller[] {
  try {
    return purgeExpired(parseCallers(storage.getItem(STORAGE_KEY)), now)
  } catch {
    return []
  }
}

export function saveCallers(storage: Pick<Storage, 'setItem'>, list: RallyCaller[]): void {
  try {
    storage.setItem(STORAGE_KEY, serializeCallers(list))
  } catch {
    // Storage full or unavailable: keep in-memory state, skip persistence.
  }
}
