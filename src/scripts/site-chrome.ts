import { mountThemeToggle } from '../lib/theme'
import { formatUtcClock } from '../lib/timer'

const NAV_INDICATOR_MS = 180
const NAV_INDICATOR_TRANSITION = `left ${NAV_INDICATOR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), width ${NAV_INDICATOR_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

let nav: HTMLElement | null = null
let indicator: HTMLElement | null = null
let activeLink: HTMLAnchorElement | null = null
let displayedLink: HTMLAnchorElement | null = null
let hoveredLink: HTMLAnchorElement | null = null
let repositionFrame = 0
let headerHidden = false
let lastScrollY = 0
let reduceMotion: MediaQueryList | null = null
let compactNav: MediaQueryList | null = null

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
  })
}

function linkFromEvent(event: Event): HTMLAnchorElement | null {
  if (!(event.target instanceof Element) || !nav) return null
  const link = event.target.closest<HTMLAnchorElement>('a')
  return link && nav.contains(link) ? link : null
}

function setup(header: HTMLElement): void {
  nav = header.querySelector('nav')
  indicator = header.querySelector('[data-nav-indicator]')
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  compactNav = window.matchMedia('(max-width: 639px), (pointer: coarse)')
  lastScrollY = window.scrollY
  activeLink = nav?.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ?? null
  displayedLink = activeLink

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
  }

  header.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!(event.target instanceof Element)) return
    const link = event.target.closest<HTMLAnchorElement>('a[data-section]')
    if (!link || !header.contains(link)) return
    const page = document.getElementById('app')?.dataset.page
    const section = link.dataset.section
    if (section === page) {
      event.preventDefault()
      return
    }
  })

  moveIndicatorTo(activeLink, false)

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
