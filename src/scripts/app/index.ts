import { connectEvents, request, resume, runCommand, sendSuspend, setToken, startHeartbeat } from './api'
import { openDialog } from './dialog'
import { el, setConnection } from './dom'
import { initInstances } from './instances'
import { appendLog, replaceLog, scrollLogToBottom } from './log'
import { initPreferences, showPreferences } from './preferences'
import { initProfiles, refreshProfiles } from './profiles'
import { setSnapshot } from './store'
import type { Snapshot } from './types'

const SECTIONS = ['instances', 'profiles', 'preferences', 'log'] as const
type Section = (typeof SECTIONS)[number]

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value)
}

function readSection(): Section {
  const hash = location.hash.replace(/^#/, '')
  return isSection(hash) ? hash : 'instances'
}

function showSection(section: Section): void {
  for (const name of SECTIONS) {
    el(`view-${name}`).hidden = name !== section
    const link = document.querySelector<HTMLAnchorElement>(`[data-section="${name}"]`)
    if (!link) continue
    if (name === section) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  if (section === 'profiles') refreshProfiles()
  if (section === 'preferences') showPreferences()
  if (section === 'log') scrollLogToBottom()
  if (location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`)
}

function setupNav(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-section]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      const section = link.dataset['section']
      if (section && isSection(section)) showSection(section)
    })
  })
  window.addEventListener('hashchange', () => showSection(readSection()))
}

let startupHandled = false

function onSnapshot(snapshot: Snapshot): void {
  setSnapshot(snapshot)
  if (startupHandled) return
  startupHandled = true
  if (!snapshot.startup?.requirements_reminder) return
  void openDialog({
    title: 'Setup requirements',
    text: 'Make sure every emulator instance is ready before starting:\n\n- ADB enabled in the emulator settings\n- Mobile resolution 720p (720x1280 portrait)\n- Whiteout Survival installed and set to English',
    confirmLabel: 'OK',
    cancelLabel: null,
  }).then(() => runCommand('ack_requirements_reminder'))
}

function blockBrowserChrome(): void {
  document.addEventListener('contextmenu', (event) => event.preventDefault())
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    if ((event.ctrlKey || event.metaKey) && ['f', 'g', 'p', 's', 'u'].includes(key)) event.preventDefault()
  })
}

export function initApp(): void {
  blockBrowserChrome()
  const token = new URLSearchParams(location.search).get('t') ?? ''
  if (!token) {
    setConnection('Missing token', 'error')
    return
  }
  setToken(token)

  initInstances()
  initProfiles()
  initPreferences()
  setupNav()
  showSection(readSection())

  connectEvents({
    onState: onSnapshot,
    onLogs: replaceLog,
    onLog: appendLog,
    onDialog: (payload) => {
      void openDialog({ title: payload.title, text: payload.text, confirmLabel: 'OK', cancelLabel: null })
    },
  })

  void request<Snapshot>('/api/state', 'GET')
    .then(onSnapshot)
    .catch((error: unknown) => {
      console.error(error)
      setConnection('Disconnected', 'error')
    })

  void resume()
  startHeartbeat()
  window.addEventListener('pagehide', () => {
    sendSuspend()
  })
}
