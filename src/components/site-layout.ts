import { mountThemeToggle } from '../theme'
import { formatUtcClock } from '../timer'

const NAV_ITEMS = [
  { section: 'simulator', label: 'Simulator', href: '../simulator/' },
  { section: 'countdown', label: 'Countdown', href: '../countdown/' },
] as const

export type SiteSection = (typeof NAV_ITEMS)[number]['section']

const NAV_LINK_CLASS =
  'flex h-full items-center text-button font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

const NAV_INDICATOR_MS = 180
const NAV_INDICATOR_TRANSITION = `left ${NAV_INDICATOR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), width ${NAV_INDICATOR_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

const SHARE_EXIT_KEY = 'wosutil:share-exit'
const SHARE_EXIT_TTL_MS = 15_000

function markShareExit(): void {
  try {
    sessionStorage.setItem(SHARE_EXIT_KEY, String(Date.now()))
  } catch {
    // Storage unavailable: skip the cross-page exit animation.
  }
}

function consumeShareExit(): boolean {
  try {
    const raw = sessionStorage.getItem(SHARE_EXIT_KEY)
    if (!raw) return false
    sessionStorage.removeItem(SHARE_EXIT_KEY)
    const at = Number.parseInt(raw, 10)
    return Number.isFinite(at) && Date.now() - at < SHARE_EXIT_TTL_MS
  } catch {
    return false
  }
}

const MOON_ICON =
  '<svg class="theme-icon-moon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 9.6A5.9 5.9 0 0 1 6.4 2.5a5.9 5.9 0 1 0 7.1 7.1Z"/></svg>'
const SUN_ICON =
  '<svg class="theme-icon-sun" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.05 3.05l1.13 1.13M11.82 11.82l1.13 1.13M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13"/></svg>'
const GITHUB_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true" class="shrink-0"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export interface SiteHeaderOptions {
  active: SiteSection
  /** Shows the Share action on pages that can share state (countdown). */
  onShare?: () => Promise<boolean>
}

export function mountSiteHeader(host: HTMLElement, options: SiteHeaderOptions): void {
  const shareExit = consumeShareExit()
  const header = el(
    'header',
    'site-header sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md',
  )
  header.id = 'site-header'

  const inner = el(
    'div',
    'mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-4 px-4 sm:h-14 sm:flex-nowrap sm:gap-x-8 sm:px-6 lg:gap-x-10 lg:px-10 xl:px-[100px]',
  )

  const brand = el(
    'a',
    'order-1 flex h-11 shrink-0 items-center text-[22px] font-medium leading-none tracking-[-0.03em] sm:h-full',
    'WoS Util',
  )
  brand.href = '../countdown/'
  brand.setAttribute('aria-label', 'WoS Util home')

  const nav = el(
    'nav',
    'relative order-3 flex h-10 w-full items-center gap-6 border-t border-line sm:order-2 sm:h-full sm:w-auto sm:flex-1 sm:border-t-0',
  )
  nav.setAttribute('aria-label', 'Sections')

  let activeLink: HTMLAnchorElement | null = null

  for (const item of NAV_ITEMS) {
    const link = el('a', NAV_LINK_CLASS, item.label)
    link.href = item.href
    link.dataset.section = item.section
    if (item.section === options.active) {
      link.classList.add('text-ink')
      link.setAttribute('aria-current', 'page')
      activeLink = link
    } else {
      link.classList.add('text-ink-muted', 'hover:text-ink')
    }
    nav.append(link)
  }

  const indicator = el('span', 'pointer-events-none absolute bottom-0 left-0 z-10 h-0.5 bg-ink')
  indicator.setAttribute('aria-hidden', 'true')
  nav.append(indicator)

  const actions = el(
    'div',
    'actions order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:gap-3',
  )
  const actionsMain = el('div', 'actions-main flex items-center gap-2 sm:gap-3')

  const clock = el(
    'p',
    'hidden font-mono text-micro tabular-nums text-ink-muted sm:block',
    'UTC: --:--:--',
  )
  clock.id = 'utc-clock'
  clock.setAttribute('aria-label', 'Current UTC time')

  const divider = el('span', 'hidden h-5 w-px bg-line sm:block')
  divider.setAttribute('aria-hidden', 'true')

  const themeButton = document.createElement('button')
  themeButton.type = 'button'
  themeButton.id = 'theme-toggle'
  themeButton.setAttribute('aria-label', 'Switch theme')
  themeButton.title = 'Switch theme'
  themeButton.setAttribute('aria-pressed', 'false')
  themeButton.className =
    'flex size-9 cursor-pointer items-center justify-center rounded-sm border border-line bg-transparent text-ink transition-colors hover:border-line-strong hover:bg-tint/50 active:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
  themeButton.innerHTML = MOON_ICON + SUN_ICON

  actionsMain.append(clock, divider, themeButton)
  actions.append(actionsMain)

  let shareSlot: HTMLDivElement | null = null
  let shareButton: HTMLButtonElement | null = null

  const updateShareShift = (): void => {
    if (!shareSlot) return
    const gap = Number.parseFloat(getComputedStyle(actions).columnGap) || 0
    actions.style.setProperty('--share-shift', `${shareSlot.offsetWidth + gap}px`)
  }

  const setShareVisible = (visible: boolean): void => {
    if (!shareButton) return
    if (!visible) updateShareShift()
    actions.toggleAttribute('data-share-hidden', !visible)
    shareButton.tabIndex = visible ? 0 : -1
    if (visible) shareButton.removeAttribute('aria-hidden')
    else shareButton.setAttribute('aria-hidden', 'true')
  }

  const onShare = options.onShare
  if (onShare || shareExit) {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = 'share-button'
    button.title = 'Copy share link with your rally setup'
    button.setAttribute('aria-label', 'Copy share link with your rally setup')
    button.className =
      'share-button cursor-pointer rounded-sm bg-invert px-4 py-2 text-button font-medium text-invert-fg hover:opacity-85 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
    button.textContent = 'Share'
    button.tabIndex = -1
    button.setAttribute('aria-hidden', 'true')

    if (onShare) {
      let resetLabel: number | undefined
      button.addEventListener('click', () => {
        void onShare().then((ok) => {
          button.textContent = ok ? 'Copied!' : 'Copy failed'
          updateShareShift()
          window.clearTimeout(resetLabel)
          resetLabel = window.setTimeout(() => {
            if (!button.isConnected) return
            button.textContent = 'Share'
            updateShareShift()
          }, 1500)
        })
      })
      actions.toggleAttribute('data-share-hidden', true)
    } else {
      button.classList.add('pointer-events-none')
    }

    const slot = el('div', 'share-slot shrink-0')
    slot.append(button)
    shareButton = button
    shareSlot = slot
    actions.append(slot)
  }

  inner.append(brand, nav, actions)
  header.append(inner)
  host.prepend(header)

  if (shareButton) {
    updateShareShift()
    const reveal = Boolean(onShare)
    window.requestAnimationFrame(() => {
      actions.toggleAttribute('data-animated', true)
      window.requestAnimationFrame(() => setShareVisible(reveal))
    })
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let displayedLink: HTMLAnchorElement | null = activeLink

  const moveIndicatorTo = (link: HTMLAnchorElement | null, animated: boolean): void => {
    if (!link) return
    displayedLink = link
    const navRect = nav.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    const instant = !animated || reduceMotion.matches
    if (instant) indicator.style.transition = 'none'
    indicator.style.left = `${linkRect.left - navRect.left}px`
    indicator.style.width = `${linkRect.width}px`
    if (instant) {
      void indicator.offsetWidth
      indicator.style.transition = NAV_INDICATOR_TRANSITION
    }
  }

  moveIndicatorTo(activeLink, false)

  let repositionFrame = 0
  const reposition = (): void => {
    if (repositionFrame !== 0) return
    repositionFrame = window.requestAnimationFrame(() => {
      repositionFrame = 0
      moveIndicatorTo(displayedLink, false)
      updateShareShift()
    })
  }

  window.addEventListener('resize', reposition)
  void document.fonts.ready.then(reposition)

  const linkFromEvent = (event: Event): HTMLAnchorElement | null => {
    const target = event.target
    if (!(target instanceof Element)) return null
    const link = target.closest<HTMLAnchorElement>('a')
    return link && nav.contains(link) ? link : null
  }

  let hoveredLink: HTMLAnchorElement | null = null

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
    const target = focusedLink && nav.contains(focusedLink) ? focusedLink : null
    moveIndicatorTo(target ?? activeLink, true)
  })

  nav.addEventListener('focusin', (event) => {
    const link = linkFromEvent(event)
    if (link) moveIndicatorTo(link, true)
  })

  nav.addEventListener('focusout', (event) => {
    const next = event.relatedTarget
    if (next instanceof Node && nav.contains(next)) return
    if (hoveredLink) return
    moveIndicatorTo(activeLink, true)
  })

  if (onShare) {
    nav.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!(event.target instanceof Element)) return
      const link = event.target.closest<HTMLAnchorElement>('a')
      if (!link || !nav.contains(link)) return
      if (link.dataset.section === options.active) return
      markShareExit()
    })
  }

  mountThemeToggle(themeButton)

  const updateClock = (): void => {
    clock.textContent = `UTC: ${formatUtcClock(new Date())}`
  }
  updateClock()
  window.setInterval(updateClock, 1000)

  const compactNav = window.matchMedia('(max-width: 639px), (pointer: coarse)')
  let headerHidden = false
  let lastScrollY = window.scrollY

  const setHeaderHidden = (next: boolean): void => {
    if (next === headerHidden) return
    headerHidden = next
    header.toggleAttribute('data-scroll-hidden', next)
  }

  const onScroll = (): void => {
    if (!compactNav.matches) {
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

  window.addEventListener('scroll', onScroll, { passive: true })
  compactNav.addEventListener('change', () => {
    lastScrollY = window.scrollY
    if (!compactNav.matches) setHeaderHidden(false)
  })
  header.addEventListener('focusin', () => setHeaderHidden(false))
}

export function mountSiteFooter(host: HTMLElement): void {
  const footer = el('footer', 'mt-auto flex justify-center px-4 py-6')
  const link = el(
    'a',
    'inline-flex items-center gap-2 text-caption text-ink-muted transition-colors hover:text-ink',
  )
  link.href = 'https://github.com/marioocm/wosutil-site'
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.innerHTML = GITHUB_ICON
  link.append('WoS-Util')
  footer.append(link)
  host.append(footer)
}
