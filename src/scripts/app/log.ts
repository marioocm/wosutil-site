import { el } from './dom'
import type { LogEntry } from './types'

const MAX_LOG_LINES = 500

export function appendLog(entry: LogEntry): void {
  const logNode = el('log')
  const atBottom = logNode.scrollTop + logNode.clientHeight >= logNode.scrollHeight - 32

  const line = document.createElement('div')
  line.className = 'app-log-line'

  const time = document.createElement('span')
  time.className = 'app-log-time'
  time.textContent = new Date(entry.time * 1000).toLocaleTimeString('en-GB', { hour12: false })

  const level = document.createElement('span')
  level.className = 'app-log-level'
  level.textContent = entry.level.toUpperCase()

  const message = document.createElement('span')
  message.textContent = ` ${entry.message}`

  line.append(time, document.createTextNode(' '), level, message)
  logNode.append(line)
  while (logNode.childElementCount > MAX_LOG_LINES) logNode.firstElementChild?.remove()
  if (atBottom) logNode.scrollTop = logNode.scrollHeight
}

export function replaceLog(entries: LogEntry[]): void {
  el('log').replaceChildren()
  for (const entry of entries) appendLog(entry)
}

export function scrollLogToBottom(): void {
  const node = el('log')
  node.scrollTop = node.scrollHeight
}
