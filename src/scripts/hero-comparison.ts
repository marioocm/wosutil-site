import {
  createClearOption,
  createHeroOption,
  bindPickerKeyboard,
} from '../components/hero-option'
import { fillHeroVisual } from '../components/hero-visual'
import {
  getGenerationLineup,
  getGenerationPreset,
  onGenerationChange,
} from '../lib/generations'
import {
  getHeroById,
  getHeroByName,
  getHeroesByType,
  getTroopTypeLabel,
  isHeroAvailable,
  type Hero,
  type TroopType,
} from '../lib/heroes'
import { dispatchHeroChange } from '../lib/hero-events'
import { onSimulatorLoad } from '../lib/simulator-load'

type Side = 'left' | 'right'

const selections = new Map<string, Hero>()

let maxGeneration: number | null = null

function slotKey(type: TroopType, side: Side): string {
  return `${type}:${side}`
}

function sideLabel(side: Side): string {
  return side === 'left' ? 'Attacker side' : 'Defender side'
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

export function initHeroComparison(): void {
  const section = document.querySelector<HTMLElement>('[data-hero-comparison]')
  if (!section) return
  const root: HTMLElement = section

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
    const previous = selections.get(slotKey(type, side)) ?? null
    selections.set(slotKey(type, side), hero)
    renderSlot(activeSlot)
    closePicker()
    dispatchHeroChange({ side, type, previousId: previous?.id ?? null, heroId: hero.id })
  }

  function clearSelection(): void {
    if (!activeSlot) return
    const type = activeSlot.dataset['heroType'] as TroopType
    const side = activeSlot.dataset['heroSide'] as Side
    const previous = selections.get(slotKey(type, side)) ?? null
    selections.delete(slotKey(type, side))
    renderSlot(activeSlot)
    closePicker()
    dispatchHeroChange({ side, type, previousId: previous?.id ?? null, heroId: null })
  }

  function applyGeneration(generation: number): void {
    maxGeneration = generation
    const preset = getGenerationPreset(generation)

    for (const slot of root.querySelectorAll<HTMLButtonElement>('[data-hero-slot]')) {
      const type = slot.dataset['heroType'] as TroopType
      const side = slot.dataset['heroSide'] as Side
      const key = slotKey(type, side)
      const current = selections.get(key)

      if (current && !isHeroAvailable(current, generation)) {
        selections.delete(key)
      }

      if (preset) {
        const hero = getHeroById(getGenerationLineup(preset, side).heroes[type])
        if (hero && isHeroAvailable(hero, generation)) {
          selections.set(key, hero)
        }
      }

      renderSlot(slot)
    }
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
      createClearOption({ kind: 'hero', onSelect: clearSelection }),
      ...getHeroesByType(type, maxGeneration).map((hero) =>
        createHeroOption(hero, {
          kind: 'hero',
          selected: current?.id === hero.id,
          onSelect: selectHero,
        }),
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

  onGenerationChange(applyGeneration)

  onSimulatorLoad((detail) => {
    for (const slot of root.querySelectorAll<HTMLButtonElement>('[data-hero-slot]')) {
      const type = slot.dataset['heroType'] as TroopType
      const side = slot.dataset['heroSide'] as Side
      const hero = getHeroByName(detail[side].heroes[type] ?? '')
      if (hero) selections.set(slotKey(type, side), hero)
      else selections.delete(slotKey(type, side))
      renderSlot(slot)
    }
  })

  closeButton.addEventListener('click', closePicker)
  bindPickerKeyboard(options, 'hero')
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
