import { fillHeroVisual } from '../components/hero-visual'
import { onGenerationChange } from '../lib/generations'
import {
  filterHeroes,
  formatHeroGeneration,
  getAllHeroes,
  getTroopTypeLabel,
  getTroopTypeShortLabel,
  isHeroAvailable,
  type Hero,
} from '../lib/heroes'

type Side = 'left' | 'right'

const OPTION_CLASS =
  'flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

function sideLabel(side: Side): string {
  return side === 'left' ? 'Left side' : 'Right side'
}

function slotKey(side: Side, index: number): string {
  return `${side}:${index}`
}

export function initJoiners(): void {
  const section = document.querySelector<HTMLElement>('[data-joiners]')
  if (!section) return
  const root: HTMLElement = section

  const toggle = section.querySelector<HTMLButtonElement>('[data-joiners-toggle]')
  const content = section.querySelector<HTMLElement>('[data-joiners-content]')
  if (toggle && content) {
    const icon = toggle.querySelector<SVGElement>('[data-joiners-icon]')
    let expanded = content.dataset['expanded'] === 'true'
    const setExpanded = (next: boolean): void => {
      expanded = next
      content.dataset['expanded'] = next ? 'true' : 'false'
      content.toggleAttribute('inert', !next)
      if (next) content.removeAttribute('aria-hidden')
      else content.setAttribute('aria-hidden', 'true')
      toggle.setAttribute('aria-expanded', next ? 'true' : 'false')
      toggle.setAttribute('aria-label', next ? 'Hide joiners' : 'Show joiners')
      toggle.title = next ? 'Hide joiners' : 'Show joiners'
      icon?.classList.toggle('rotate-180', next)
    }
    toggle.addEventListener('click', () => setExpanded(!expanded))
    setExpanded(expanded)
  }

  const picker = section.querySelector<HTMLDialogElement>('#joiner-picker')
  const pickerTitle = section.querySelector<HTMLElement>('#joiner-picker-title')
  const pickerSide = section.querySelector<HTMLElement>('[data-joiner-picker-side]')
  const searchElement = section.querySelector<HTMLInputElement>('[data-joiner-search]')
  const optionsElement = section.querySelector<HTMLElement>('[data-joiner-options]')
  const closeButton = section.querySelector<HTMLButtonElement>('[data-joiner-close]')
  if (!picker || !pickerTitle || !pickerSide || !searchElement || !optionsElement || !closeButton) {
    return
  }

  const dialog: HTMLDialogElement = picker
  const title: HTMLElement = pickerTitle
  const sideText: HTMLElement = pickerSide
  const search: HTMLInputElement = searchElement
  const options: HTMLElement = optionsElement
  const selections = new Map<string, Hero>()
  let activeSlot: HTMLButtonElement | null = null
  let maxGeneration: number | null = null

  function currentSelection(): Hero | null {
    if (!activeSlot) return null
    const side = activeSlot.dataset['joinerSide'] as Side
    const index = Number(activeSlot.dataset['joinerIndex'])
    return selections.get(slotKey(side, index)) ?? null
  }

  function renderSlot(button: HTMLButtonElement): void {
    const side = button.dataset['joinerSide'] as Side
    const index = Number(button.dataset['joinerIndex'])
    const hero = selections.get(slotKey(side, index)) ?? null
    const visual = button.querySelector<HTMLElement>('[data-joiner-visual]')
    const caption = button.querySelector<HTMLElement>('[data-joiner-caption]')
    const typeLabel = button.querySelector<HTMLElement>('[data-joiner-type]')
    if (visual) fillHeroVisual(visual, hero)
    if (caption) caption.textContent = hero?.name ?? 'Select'
    if (typeLabel) {
      typeLabel.textContent = hero ? getTroopTypeShortLabel(hero.type) : ''
      typeLabel.hidden = !hero
    }
    button.dataset['joinerSelected'] = hero ? 'true' : 'false'
  }

  function closePicker(): void {
    if (dialog.open) dialog.close()
  }

  function selectHero(hero: Hero): void {
    if (!activeSlot) return
    const side = activeSlot.dataset['joinerSide'] as Side
    const index = Number(activeSlot.dataset['joinerIndex'])
    selections.set(slotKey(side, index), hero)
    renderSlot(activeSlot)
    closePicker()
  }

  function clearSelection(): void {
    if (!activeSlot) return
    const side = activeSlot.dataset['joinerSide'] as Side
    const index = Number(activeSlot.dataset['joinerIndex'])
    selections.delete(slotKey(side, index))
    renderSlot(activeSlot)
    closePicker()
  }

  function createHeroOption(hero: Hero, selected: boolean): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = OPTION_CLASS
    button.dataset['joinerOption'] = hero.id
    button.dataset['joinerSelected'] = selected ? 'true' : 'false'

    const avatar = document.createElement('span')
    avatar.className =
      'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-background text-micro font-medium text-ink-muted'
    avatar.setAttribute('aria-hidden', 'true')
    fillHeroVisual(avatar, hero)

    const name = document.createElement('span')
    name.className = 'min-w-0 flex-1 truncate text-p2 text-ink'
    name.textContent = hero.name

    const meta = document.createElement('span')
    meta.className = 'shrink-0 text-micro text-ink-muted'
    meta.textContent = `${formatHeroGeneration(hero.generation)} · ${getTroopTypeLabel(hero.type)}`

    button.append(avatar, name, meta)

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

    button.addEventListener('click', () => selectHero(hero))
    return button
  }

  function createNoneOption(): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `${OPTION_CLASS} mb-1 border-b border-line pb-3`
    button.dataset['joinerOption'] = 'none'
    button.dataset['joinerNone'] = 'true'

    const avatar = document.createElement('span')
    avatar.className =
      'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-background text-p2 text-ink-muted'
    avatar.setAttribute('aria-hidden', 'true')
    avatar.textContent = '−'

    const name = document.createElement('span')
    name.className = 'min-w-0 flex-1 text-p2 text-ink'
    name.textContent = 'None'

    const meta = document.createElement('span')
    meta.className = 'shrink-0 text-micro text-ink-muted'
    meta.textContent = 'Clear'

    button.append(avatar, name, meta)
    button.addEventListener('click', clearSelection)
    return button
  }

  function renderOptions(): void {
    const query = search.value
    const heroes = filterHeroes(getAllHeroes(maxGeneration), query)
    const current = currentSelection()
    const nodes: HTMLElement[] = []

    if (query.trim() === '') nodes.push(createNoneOption())

    if (heroes.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'p-3 text-center text-p3 text-ink-muted'
      empty.textContent = 'No heroes found.'
      options.replaceChildren(empty)
      return
    }

    options.replaceChildren(
      ...nodes,
      ...heroes.map((hero) => createHeroOption(hero, current?.id === hero.id)),
    )
  }

  function openPicker(slot: HTMLButtonElement): void {
    const side = slot.dataset['joinerSide'] as Side
    const index = Number(slot.dataset['joinerIndex'])
    activeSlot = slot
    title.textContent = `Select joiner ${index}`
    sideText.textContent = sideLabel(side)
    search.value = ''
    renderOptions()
    dialog.showModal()
    search.focus()
  }

  function applyGeneration(generation: number): void {
    maxGeneration = generation

    for (const slot of root.querySelectorAll<HTMLButtonElement>('[data-joiner-slot]')) {
      const side = slot.dataset['joinerSide'] as Side
      const index = Number(slot.dataset['joinerIndex'])
      const key = slotKey(side, index)
      const current = selections.get(key)
      if (current && !isHeroAvailable(current, generation)) {
        selections.delete(key)
      }
      renderSlot(slot)
    }

    if (dialog.open) renderOptions()
  }

  for (const slot of section.querySelectorAll<HTMLButtonElement>('[data-joiner-slot]')) {
    renderSlot(slot)
    slot.addEventListener('click', () => openPicker(slot))
  }

  onGenerationChange(applyGeneration)

  closeButton.addEventListener('click', closePicker)
  search.addEventListener('input', () => {
    renderOptions()
    options.scrollTop = 0
  })
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown') return
    const firstHero = options.querySelector<HTMLButtonElement>(
      '[data-joiner-option]:not([data-joiner-none])',
    )
    if (!firstHero) return
    event.preventDefault()
    firstHero.focus()
  })
  options.addEventListener('keydown', (event) => {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    const items = [...options.querySelectorAll<HTMLButtonElement>('[data-joiner-option]')]
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
    search.value = ''
    if (!trigger) return
    window.setTimeout(() => {
      if (!dialog.open && trigger.isConnected) trigger.focus()
    }, 0)
  })
}
