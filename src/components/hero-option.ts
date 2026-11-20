import { formatHeroGeneration, getTroopTypeLabel, type Hero } from '../lib/heroes'
import { fillHeroVisual } from './hero-visual'

export type HeroOptionKind = 'hero' | 'joiner' | 'report'

export interface HeroOptionOptions {
  kind: HeroOptionKind
  selected?: boolean
  showType?: boolean
  onSelect: (hero: Hero) => void
}

export interface ClearOptionOptions {
  kind: HeroOptionKind
  label?: string
  meta?: string
  onSelect: () => void
}

const OPTION_CLASS =
  'flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

const AVATAR_CLASS =
  'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-background text-micro font-medium text-ink-muted'

function setOptionState(
  button: HTMLButtonElement,
  kind: HeroOptionKind,
  selected: boolean,
): void {
  button.dataset[`${kind}Selected`] = selected ? 'true' : 'false'
}

function appendSelectedCheck(button: HTMLButtonElement): void {
  const check = document.createElement('span')
  check.className = 'shrink-0 text-p2 text-ink'
  check.setAttribute('aria-hidden', 'true')
  check.textContent = '✓'

  const selectedLabel = document.createElement('span')
  selectedLabel.className = 'sr-only'
  selectedLabel.textContent = 'Selected'

  button.append(check, selectedLabel)
}

/** Builds one hero row shared by the simulator and archive pickers. */
export function createHeroOption(hero: Hero, options: HeroOptionOptions): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = OPTION_CLASS
  button.dataset[`${options.kind}Option`] = hero.id
  setOptionState(button, options.kind, Boolean(options.selected))

  const avatar = document.createElement('span')
  avatar.className = AVATAR_CLASS
  avatar.setAttribute('aria-hidden', 'true')
  fillHeroVisual(avatar, hero)

  const name = document.createElement('span')
  name.className = 'min-w-0 flex-1 truncate text-p2 text-ink'
  name.textContent = hero.name

  const meta = document.createElement('span')
  meta.className = 'shrink-0 text-micro text-ink-muted'
  meta.textContent = options.showType
    ? `${formatHeroGeneration(hero.generation)} · ${getTroopTypeLabel(hero.type)}`
    : formatHeroGeneration(hero.generation)

  button.append(avatar, name, meta)
  if (options.selected) appendSelectedCheck(button)

  button.addEventListener('click', () => options.onSelect(hero))
  return button
}

/** Builds the leading "None" / "Any hero" row that clears a picker. */
export function createClearOption(options: ClearOptionOptions): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${OPTION_CLASS} mb-1 border-b border-line pb-3`
  button.dataset[`${options.kind}Option`] = 'none'
  button.dataset[`${options.kind}None`] = 'true'
  setOptionState(button, options.kind, false)

  const avatar = document.createElement('span')
  avatar.className = `${AVATAR_CLASS} text-p2`
  avatar.setAttribute('aria-hidden', 'true')
  avatar.textContent = '−'

  const name = document.createElement('span')
  name.className = 'min-w-0 flex-1 text-p2 text-ink'
  name.textContent = options.label ?? 'None'

  const meta = document.createElement('span')
  meta.className = 'shrink-0 text-micro text-ink-muted'
  meta.textContent = options.meta ?? 'Clear'

  button.append(avatar, name, meta)
  button.addEventListener('click', options.onSelect)
  return button
}

export function pickerItemSelector(kind: HeroOptionKind): string {
  return `[data-${kind}-option]`
}

/** Arrow/Home/End focus movement for a picker list. */
export function bindPickerKeyboard(container: HTMLElement, kind: HeroOptionKind): void {
  container.addEventListener('keydown', (event) => {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    const items = [...container.querySelectorAll<HTMLButtonElement>(pickerItemSelector(kind))]
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
}
