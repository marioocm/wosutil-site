import { mountThemeToggle } from '../lib/theme'
import { formatUtcClock } from '../lib/timer'

const NAV_INDICATOR_MS = 180
const NAV_INDICATOR_TRANSITION = `left ${NAV_INDICATOR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), width ${NAV_INDICATOR_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
const SHARE_RESET_MS = 1500
const SHARE_EXIT_KEY = 'wosutil:share-exit'

type ShareHandler = () => Promise<boolean>

let nav: HTMLElement | null = null
let actions: HTMLElement | null = null
let indicator: HTMLElement | null = null
let shareButton: HTMLButtonElement | null = null
let shareSlot: HTMLElement | null = null
let activeLink: HTMLAnchorElement | null = null
let displayedLink: HTMLAnchorElement | null = null
let hoveredLink: HTMLAnchorElement | null = null
let shareHandler: ShareHandler | null = null
let shareClickId = 0
let resetLabel: number | undefined
let repositionFrame = 0
let headerHidden = false
let lastScrollY = 0
let reduceMotion: MediaQueryList | null = null
let compactNav: MediaQueryList | null = null

function updateShareShift(): void {
  if (!actions || !shareSlot) return
  const gap = Number.parseFloat(getComputedStyle(actions).columnGap) || 0
  actions.style.setProperty('--share-shift', `${shareSlot.offsetWidth + gap}px`)
}

export function setShareHandler(handler: ShareHandler | null): void {
  shareHandler = handler
}

function setShareVisible(visible: boolean): void {
  if (!actions || !shareButton) return
  if (!visible) updateShareShift()
  actions.toggleAttribute('data-share-hidden', !visible)
  shareButton.tabIndex = visible ? 0 : -1
  if (visible) shareButton.removeAttribute('aria-hidden')
  else shareButton.setAttribute('aria-hidden', 'true')
}

function moveIndicatorTo(link: HTMLAnchorElement | null, animated: boolean): void {
  if (!link || !nav || !indicator) return
  displayedLink = link
  const navRect = nav.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()
  const instant = !animated || reduceMotion?.matches === true
  if (instant) indicator.style.transition = 'none'
  indicator.style.left = `${linkRect.left - navRect.left}px`
  indicator.style.width = `${linkRect.width}px`
  if (instant) {
    void indicator.offsetWidth
    indicator.style.transition = NAV_INDICATOR_TRANSITION
  }
}

function setHeaderHidden(next: boolean): void {
  const header = document.getElementById('site-header')
  if (next === headerHidden || !header) return
  headerHidden = next
  header.toggleAttribute('data-scroll-hidden', next)
}

function onScroll(): void {
  if (!compactNav?.matches) {
    setHeaderHidden(false)
    lastScrollY = window.scrollY
    return
  }
  const y = window.scrollY
  const delta = y - lastScrollY
  lastScrollY = y
  if (y <= 64) setHeaderHidden(false)
  else if (delta > 2) setHeaderHidden(true)
  else if (delta < -2) setHeaderHidden(false)
}

function reposition(): void {
  if (repositionFrame !== 0) return
  repositionFrame = window.requestAnimationFrame(() => {
    repositionFrame = 0
    moveIndicatorTo(displayedLink, false)
    updateShareShift()
  })
}

function linkFromEvent(event: Event): HTMLAnchorElement | null {
  if (!(event.target instanceof Element) || !nav) return null
  const link = event.target.closest<HTMLAnchorElement>('a')
  return link && nav.contains(link) ? link : null
}

function setup(header: HTMLElement): void {
  nav = header.querySelector('nav')
  actions = header.querySelector('.actions')
  indicator = header.querySelector('[data-nav-indicator]')
  shareSlot = header.querySelector('.share-slot')
  shareButton = header.querySelector('#share-button')
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  compactNav = window.matchMedia('(max-width: 639px), (pointer: coarse)')
  lastScrollY = window.scrollY
  activeLink = nav?.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ?? null
  displayedLink = activeLink

  if (shareButton) {
    const button = shareButton
    button.addEventListener('click', () => {
      if (!shareHandler) return
      const clickId = ++shareClickId
      window.clearTimeout(resetLabel)
      void shareHandler().then((ok) => {
        if (clickId !== shareClickId) return
        button.textContent = ok ? 'Copied!' : 'Copy failed'
        updateShareShift()
        window.clearTimeout(resetLabel)
        resetLabel = window.setTimeout(() => {
          if (!button.isConnected) return
          button.textContent = 'Share'
          updateShareShift()
        }, SHARE_RESET_MS)
      })
    })
  }

  const clock = header.querySelector<HTMLElement>('#utc-clock')
  if (clock) {
    const updateClock = (): void => {
      clock.textContent = `UTC: ${formatUtcClock(new Date())}`
    }
    updateClock()
    window.setInterval(updateClock, 1000)
  }

  const themeButton = header.querySelector<HTMLButtonElement>('#theme-toggle')
  if (themeButton) mountThemeToggle(themeButton)

  if (nav) {
    nav.addEventListener('pointerover', (event) => {
      const link = linkFromEvent(event)
      if (link) {
        hoveredLink = link
        moveIndicatorTo(link, true)
      }
    })

    nav.addEventListener('pointerleave', () => {
      hoveredLink = null
      const focused = document.activeElement
      const focusedLink =
        focused instanceof Element ? focused.closest<HTMLAnchorElement>('a') : null
      const target = focusedLink && nav?.contains(focusedLink) ? focusedLink : null
      moveIndicatorTo(target ?? activeLink, true)
    })

    nav.addEventListener('focusin', (event) => {
      const link = linkFromEvent(event)
      if (link) moveIndicatorTo(link, true)
    })

    nav.addEventListener('focusout', (event) => {
      const next = event.relatedTarget
      if (next instanceof Node && nav?.contains(next)) return
      if (hoveredLink) return
      moveIndicatorTo(activeLink, true)
    })

    nav.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!(event.target instanceof Element)) return
      const link = event.target.closest<HTMLAnchorElement>('a')
      if (!link || !nav?.contains(link)) return
      if (link.dataset.section === 'countdown') return
      if (document.getElementById('app')?.dataset.page !== 'countdown') return
      try {
        sessionStorage.setItem(SHARE_EXIT_KEY, String(Date.now()))
      } catch {
        // Storage unavailable: skip the exit animation.
      }
    })
  }

  moveIndicatorTo(activeLink, false)
  updateShareShift()

  const page = document.getElementById('app')?.dataset.page
  if (page === 'countdown') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShareVisible(true))
    })
  } else if (actions?.hasAttribute('data-share-exit')) {
    actions.removeAttribute('data-share-exit')
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShareVisible(false))
    })
  }

  window.addEventListener('resize', reposition)
  void document.fonts.ready.then(reposition)
  window.addEventListener('scroll', onScroll, { passive: true })
  compactNav.addEventListener('change', () => {
    lastScrollY = window.scrollY
    if (!compactNav?.matches) setHeaderHidden(false)
  })
  header.addEventListener('focusin', () => setHeaderHidden(false))
}

export function initSiteChrome(): void {
  const header = document.getElementById('site-header')
  if (!header || header.dataset.chromeReady === 'true') return
  header.dataset.chromeReady = 'true'
  setup(header)
}
