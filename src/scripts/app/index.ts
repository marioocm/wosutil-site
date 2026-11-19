import { connectEvents, request, resume, runCommand, sendSuspend, setToken, startHeartbeat } from './api'
import { openDialog, showError } from './dialog'
import { el } from './dom'
import { initInstances } from './instances'
import { appendLog, replaceLog, scrollLogToBottom } from './log'
import { initPreferences, showPreferences } from './preferences'
import { initProfiles, refreshProfiles } from './profiles'
import { setSnapshot } from './store'
import type { Snapshot } from './types'

const SECTIONS = ['instances', 'profiles', 'preferences', 'log'] as const
type Section = (typeof SECTIONS)[number]

// Slightly longer than the site's 180ms: the desktop nav is narrower, so
// the same motion reads as a jump instead of a slide.
const NAV_MOTION_MS = 260
const NAV_TRANSITION = `left ${NAV_MOTION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), width ${NAV_MOTION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

let nav: HTMLElement | null = null
let navIndicator: HTMLElement | null = null
let navActive: HTMLAnchorElement | null = null
let navHovered: HTMLAnchorElement | null = null
let reduceMotion: MediaQueryList | null = null

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value)
}

function readSection(): Section {
  const hash = location.hash.replace(/^#/, '')
  return isSection(hash) ? hash : 'instances'
}

function moveNavIndicator(link: HTMLAnchorElement | null, animated: boolean): void {
  if (!link || !nav || !navIndicator) return
  const navRect = nav.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()
  const instant = !animated || reduceMotion?.matches === true
  if (instant) navIndicator.style.transition = 'none'
  navIndicator.style.left = `${linkRect.left - navRect.left}px`
  navIndicator.style.width = `${linkRect.width}px`
  if (instant) {
    void navIndicator.offsetWidth
    navIndicator.style.transition = NAV_TRANSITION
  }
}

function linkFromNavEvent(event: Event): HTMLAnchorElement | null {
  if (!(event.target instanceof Element) || !nav) return null
  const link = event.target.closest<HTMLAnchorElement>('a')
  return link && nav.contains(link) ? link : null
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
  document.querySelector<HTMLElement>('.app-main')?.scrollTo({ top: 0 })
  navActive = document.querySelector<HTMLAnchorElement>('[data-section][aria-current="page"]')
  if (!navHovered) moveNavIndicator(navActive, true)
}

function setupNav(): void {
  nav = document.querySelector<HTMLElement>('.app-nav')
  navIndicator = document.querySelector<HTMLElement>('[data-nav-indicator]')
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  navActive = document.querySelector<HTMLAnchorElement>('[data-section][aria-current="page"]')

  document.querySelectorAll<HTMLAnchorElement>('[data-section]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      const section = link.dataset['section']
      if (section && isSection(section)) showSection(section)
    })
  })
  window.addEventListener('hashchange', () => showSection(readSection()))

  nav?.addEventListener('pointerover', (event) => {
    const link = linkFromNavEvent(event)
    if (!link) return
    navHovered = link
    moveNavIndicator(link, true)
  })
  nav?.addEventListener('pointerleave', () => {
    navHovered = null
    const focused = document.activeElement
    const focusedLink = focused instanceof Element ? focused.closest<HTMLAnchorElement>('a') : null
    moveNavIndicator(focusedLink && nav?.contains(focusedLink) ? focusedLink : navActive, true)
  })
  nav?.addEventListener('focusin', (event) => {
    const link = linkFromNavEvent(event)
    if (link) moveNavIndicator(link, true)
  })
  nav?.addEventListener('focusout', (event) => {
    const next = event.relatedTarget
    if (next instanceof Node && nav?.contains(next)) return
    if (navHovered) return
    moveNavIndicator(navActive, true)
  })

  moveNavIndicator(navActive, false)
  window.addEventListener('resize', () => moveNavIndicator(navHovered ?? navActive, false))
  void document.fonts.ready.then(() => moveNavIndicator(navHovered ?? navActive, false))
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
    showError('The access token is missing. Restart the application.')
    return
  }
  setToken(token)

  initInstances()
  initProfiles()
  initPreferences()
  showSection(readSection())
  setupNav()

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
      showError('Could not connect to the application service.')
    })

  void resume()
  startHeartbeat()
  window.addEventListener('pagehide', () => {
    sendSuspend()
  })
}
