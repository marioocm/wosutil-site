import { formatHeroGeneration, getHeroById, heroInitials, type Hero } from '../lib/heroes'
import { getHeroImage } from '../lib/hero-images'
import type { JoinerPack } from '../lib/joiner-packs'

const TIP_MARGIN = 8
const TIP_GAP = 8

function element(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function avatar(hero: Hero): HTMLElement {
  const wrapper = element('span', 'joiner-tip-avatar')
  const fallback = element('span', 'joiner-tip-avatar-fallback')
  fallback.textContent = heroInitials(hero.name)
  wrapper.append(fallback)

  const src = getHeroImage(hero.id)
  if (!src) return wrapper

  const image = document.createElement('img')
  image.alt = ''
  image.width = 24
  image.height = 24
  image.loading = 'lazy'
  image.decoding = 'async'
  image.fetchPriority = 'low'
  image.referrerPolicy = 'no-referrer'
  image.addEventListener(
    'load',
    () => {
      fallback.hidden = true
    },
    { once: true },
  )
  image.addEventListener('error', () => image.remove(), { once: true })
  image.src = src
  wrapper.append(image)
  return wrapper
}

function content(pack: JoinerPack, activeId: string): DocumentFragment {
  const fragment = document.createDocumentFragment()

  const head = element('span', 'joiner-tip-head')
  const tag = element('span', 'joiner-tip-tag')
  tag.textContent = 'Same S1'
  const effect = element('span', 'joiner-tip-effect')
  effect.textContent = pack.effect
  head.append(tag, effect)

  const grid = element('span', 'joiner-tip-grid')
  for (const heroId of pack.members) {
    const hero = getHeroById(heroId)
    if (!hero) continue
    const member = element(
      'span',
      `joiner-tip-member${hero.id === activeId ? ' is-active' : ''}`,
    )
    const name = element('span', 'joiner-tip-name')
    name.textContent = hero.name
    const generation = element('span', 'joiner-tip-gen')
    generation.textContent = formatHeroGeneration(hero.generation)
    member.append(avatar(hero), name, generation)
    grid.append(member)
  }

  fragment.append(head, grid)
  return fragment
}

export interface JoinerTipController {
  /** Show the card anchored to `anchor`, highlighting the current hero. */
  show(anchor: HTMLElement, pack: JoinerPack, activeId?: string): void
  hide(): void
  /** Whether the card is currently anchored to `anchor`. */
  anchoredTo(anchor: HTMLElement): boolean
}

export function createJoinerTip(): JoinerTipController {
  const tip = element('div', 'joiner-tip')
  tip.setAttribute('popover', 'manual')
  tip.setAttribute('role', 'tooltip')
  document.body.append(tip)
  let anchor: HTMLElement | null = null

  const hide = (): void => {
    anchor = null
    if (tip.matches(':popover-open')) tip.hidePopover()
  }

  const position = (target: HTMLElement): void => {
    const rect = target.getBoundingClientRect()
    tip.style.left = '0px'
    tip.style.top = '0px'
    const tipRect = tip.getBoundingClientRect()
    let left = rect.left + rect.width / 2 - tipRect.width / 2
    left = Math.max(TIP_MARGIN, Math.min(left, window.innerWidth - tipRect.width - TIP_MARGIN))
    let top = rect.top - tipRect.height - TIP_GAP
    if (top < TIP_MARGIN) {
      top = Math.min(window.innerHeight - tipRect.height - TIP_MARGIN, rect.bottom + TIP_GAP)
    }
    tip.style.left = `${Math.round(left)}px`
    tip.style.top = `${Math.round(top)}px`
  }

  const show = (target: HTMLElement, pack: JoinerPack, activeId = ''): void => {
    tip.replaceChildren(content(pack, activeId))
    anchor = target
    if (!tip.matches(':popover-open')) tip.showPopover()
    position(target)
  }

  window.addEventListener('resize', hide)
  window.addEventListener('scroll', hide, true)

  return {
    show,
    hide,
    anchoredTo: (target) => anchor === target,
  }
}
