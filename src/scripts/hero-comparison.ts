import { getHeroImage } from '../lib/hero-images'
import {
  formatHeroGeneration,
  getHeroesByType,
  getTroopTypeLabel,
  heroInitials,
  type Hero,
  type TroopType,
} from '../lib/heroes'

type Side = 'left' | 'right'

const OPTION_CLASS =
  'flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

const selections = new Map<string, Hero>()

function slotKey(type: TroopType, side: Side): string {
  return `${type}:${side}`
}

function sideLabel(side: Side): string {
  return side === 'left' ? 'Left side' : 'Right side'
}

function fillHeroVisual(container: HTMLElement, hero: Hero | null): void {
  container.replaceChildren()

  const fallback = document.createElement('span')
  fallback.textContent = hero ? heroInitials(hero.name) : '+'
  container.append(fallback)

  if (!hero) return

  const src = getHeroImage(hero.id)
  if (!src) return

  const image = document.createElement('img')
  image.alt = ''
  image.loading = 'lazy'
  image.decoding = 'async'
  image.referrerPolicy = 'no-referrer'
  image.draggable = false
  image.className = 'absolute inset-0 h-full w-full object-cover'
  image.addEventListener(
    'load',
    () => {
      fallback.hidden = true
    },
    { once: true },
  )
  image.addEventListener('error', () => image.remove(), { once: true })
  image.src = src
  container.append(image)
}

function renderSlot(button: HTMLButtonElement): void {
  const type = button.dataset['heroType'] as TroopType
  const side = button.dataset['heroSide'] as Side
  const hero = selections.get(slotKey(type, side)) ?? null
  const visual = button.querySelector<HTMLElement>('[data-hero-visual]')
  const caption = button.querySelector<HTMLElement>('[data-hero-caption]')
  if (visual) fillHeroVisual(visual, hero)
  if (caption) caption.textContent = hero?.name ?? 'Select'
  button.dataset['heroSelected'] = hero ? 'true' : 'false'
}

function createHeroOption(
  hero: Hero,
  selected: boolean,
  onSelect: (hero: Hero) => void,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = OPTION_CLASS
  button.dataset['heroOption'] = hero.id
  button.dataset['heroSelected'] = selected ? 'true' : 'false'

  const avatar = document.createElement('span')
  avatar.className =
    'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-background text-micro font-medium text-ink-muted'
  fillHeroVisual(avatar, hero)

  const name = document.createElement('span')
  name.className = 'min-w-0 flex-1 truncate text-p2 text-ink'
  name.textContent = hero.name

  const generation = document.createElement('span')
  generation.className = 'shrink-0 text-micro text-ink-muted'
  generation.textContent = formatHeroGeneration(hero.generation)

  button.append(avatar, name, generation)

  if (selected) {
    const check = document.createElement('span')
    check.className = 'shrink-0 text-p2 text-ink'
    check.setAttribute('aria-hidden', 'true')
    check.textContent = '✓'

    const selectedLabel = document.createElement('span')
    selectedLabel.className = 'sr-only'
    selectedLabel.textContent = 'Selected'

    button.append(check, selectedLabel)
  }

  button.addEventListener('click', () => onSelect(hero))
  return button
}

function createNoneOption(onSelect: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${OPTION_CLASS} mb-1 border-b border-line pb-3`
  button.dataset['heroOption'] = 'none'
  button.dataset['heroNone'] = 'true'

  const avatar = document.createElement('span')
  avatar.className =
    'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-background text-p2 text-ink-muted'
  avatar.textContent = '−'

  const name = document.createElement('span')
  name.className = 'min-w-0 flex-1 text-p2 text-ink'
  name.textContent = 'None'

  const meta = document.createElement('span')
  meta.className = 'shrink-0 text-micro text-ink-muted'
  meta.textContent = 'Clear'

  button.append(avatar, name, meta)
  button.addEventListener('click', onSelect)
  return button
}

export function initHeroComparison(): void {
  const section = document.querySelector<HTMLElement>('[data-hero-comparison]')
  if (!section) return

  const dialog = section.querySelector<HTMLDialogElement>('#hero-picker')
  const title = section.querySelector<HTMLElement>('#hero-picker-title')
  const sideText = section.querySelector<HTMLElement>('[data-hero-picker-side]')
  const options = section.querySelector<HTMLElement>('[data-hero-options]')
  const closeButton = section.querySelector<HTMLButtonElement>('[data-hero-close]')
  if (!dialog || !title || !sideText || !options || !closeButton) return

  let activeSlot: HTMLButtonElement | null = null

  function closePicker(): void {
    if (dialog?.open) dialog.close()
  }

  function selectHero(hero: Hero): void {
    if (!activeSlot) return
    const type = activeSlot.dataset['heroType'] as TroopType
    const side = activeSlot.dataset['heroSide'] as Side
    selections.set(slotKey(type, side), hero)
    renderSlot(activeSlot)
    closePicker()
  }

  function clearSelection(): void {
    if (!activeSlot) return
    const type = activeSlot.dataset['heroType'] as TroopType
    const side = activeSlot.dataset['heroSide'] as Side
    selections.delete(slotKey(type, side))
    renderSlot(activeSlot)
    closePicker()
  }

  function openPicker(slot: HTMLButtonElement): void {
    if (!dialog || !title || !sideText || !options) return

    const type = slot.dataset['heroType'] as TroopType
    const side = slot.dataset['heroSide'] as Side
    const current = selections.get(slotKey(type, side))

    activeSlot = slot
    title.textContent = `Select ${getTroopTypeLabel(type)} hero`
    sideText.textContent = sideLabel(side)
    options.replaceChildren(
      createNoneOption(clearSelection),
      ...getHeroesByType(type).map((hero) =>
        createHeroOption(hero, current?.id === hero.id, selectHero),
      ),
    )

    dialog.showModal()

    const selected = options.querySelector<HTMLButtonElement>(
      '[data-hero-option][data-hero-selected="true"]',
    )
    const firstHero = options.querySelector<HTMLButtonElement>(
      '[data-hero-option]:not([data-hero-none])',
    )
    ;(selected ?? firstHero)?.focus()
  }

  for (const slot of section.querySelectorAll<HTMLButtonElement>('[data-hero-slot]')) {
    renderSlot(slot)
    slot.addEventListener('click', () => openPicker(slot))
  }

  closeButton.addEventListener('click', closePicker)
  options.addEventListener('keydown', (event) => {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    const items = [...options.querySelectorAll<HTMLButtonElement>('[data-hero-option]')]
    const focused = document.activeElement
    if (!(focused instanceof HTMLButtonElement)) return
    const index = items.indexOf(focused)
    if (index === -1) return

    event.preventDefault()
    let next = index
    if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = items.length - 1
    } else if (event.key === 'ArrowDown') {
      next = Math.min(index + 1, items.length - 1)
    } else {
      next = Math.max(index - 1, 0)
    }
    items[next]?.focus()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closePicker()
  })
  dialog.addEventListener('close', () => {
    const trigger = activeSlot
    activeSlot = null
    if (!trigger) return
    window.setTimeout(() => {
      if (!dialog.open && trigger.isConnected) trigger.focus()
    }, 0)
  })
}
