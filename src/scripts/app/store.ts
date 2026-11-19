import type { Snapshot } from './types'

type Listener = (snapshot: Snapshot) => void

let current: Snapshot | null = null
const listeners = new Set<Listener>()

export function setSnapshot(snapshot: Snapshot): void {
  current = snapshot
  for (const listener of listeners) listener(snapshot)
}

export function getSnapshot(): Snapshot | null {
  return current
}

export function subscribe(listener: Listener): void {
  listeners.add(listener)
  if (current) listener(current)
}
