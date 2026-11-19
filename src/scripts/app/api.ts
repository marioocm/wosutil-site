import { setConnection } from './dom'
import type { ActionResult, DialogPayload, LogEntry, Snapshot } from './types'

let token = ''

export function setToken(value: string): void {
  token = value
}

export function getToken(): string {
  return token
}

export async function request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-WosUtil-Token': token }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

export async function runCommand(command: string, args: Record<string, unknown> = {}): Promise<ActionResult> {
  return request<ActionResult>('/api/command', 'POST', { command, args })
}

function parseEvent<T>(event: Event): T {
  return JSON.parse((event as MessageEvent<string>).data) as T
}

export function connectEvents(handlers: {
  onState: (snapshot: Snapshot) => void
  onLogs: (entries: LogEntry[]) => void
  onLog: (entry: LogEntry) => void
  onDialog: (payload: DialogPayload) => void
}): void {
  const source = new EventSource(`/api/events?t=${encodeURIComponent(token)}`)
  source.addEventListener('open', () => setConnection('Live', 'live'))
  source.addEventListener('error', () => setConnection('Reconnecting…', 'error'))
  source.addEventListener('state', (event) => handlers.onState(parseEvent<Snapshot>(event)))
  source.addEventListener('logs', (event) => handlers.onLogs(parseEvent<{ entries: LogEntry[] }>(event).entries))
  source.addEventListener('log', (event) => handlers.onLog(parseEvent<LogEntry>(event)))
  source.addEventListener('dialog', (event) => handlers.onDialog(parseEvent<DialogPayload>(event)))
}

export function startHeartbeat(): void {
  window.setInterval(() => {
    void request('/api/heartbeat', 'POST').catch(() => {})
  }, 3000)
}

export async function resume(): Promise<void> {
  await request('/api/resume', 'POST').catch(() => {})
}

export function sendSuspend(): void {
  navigator.sendBeacon(`/api/suspend?t=${encodeURIComponent(token)}`)
}
