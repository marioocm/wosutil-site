import {
  bindPickerKeyboard,
  createClearOption,
  createHeroOption,
  createHeroPackOption,
} from '../components/hero-option'
import { fillHeroVisual } from '../components/hero-visual'
import { getGenerationLineup, getGenerationPreset, onGenerationChange } from '../lib/generations'
import {
  filterHeroes,
  getAllHeroes,
  getHeroById,
  getTroopTypeShortLabel,
  isHeroAvailable,
  type Hero,
} from '../lib/heroes'
import {
  expandJoinerMatches,
  getJoinerPack,
  getJoinerPackMates,
  groupJoinerItems,
  joinerPackNames,
  sortJoinerHeroes,
  type JoinerPack,
} from '../lib/joiner-packs'

type Side = 'left' | 'right'

function sideLabel(side: Side): string {
  return side === 'left' ? 'Attacker side' : 'Defender side'
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
  let setJoinersExpanded: ((next: boolean) => void) | null = null
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
    setJoinersExpanded = setExpanded
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
  const equivalenceNote = section.querySelector<HTMLElement>('[data-joiner-equivalence]')
  const selections = new Map<string, Hero>()
  let activeSlot: HTMLButtonElement | null = null
  let maxGeneration: number | null = null

  function renderPackNote(): void {
    if (!equivalenceNote) return
    const packs = new Map<string, JoinerPack>()
    for (const hero of selections.values()) {
      const pack = getJoinerPack(hero.id)
      if (pack) packs.set(pack.id, pack)
    }
    if (packs.size === 0) {
      equivalenceNote.hidden = true
      equivalenceNote.replaceChildren()
      return
    }
    equivalenceNote.hidden = false
    equivalenceNote.replaceChildren(
      ...[...packs.values()].map((pack) => {
        const line = document.createElement('span')
        line.className = 'block'
        line.textContent = `Same S1 (${pack.effect}): ${joinerPackNames(pack).join(', ')}`
        return line
      }),
    )
  }

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
    const equivalent = button.querySelector<HTMLElement>('[data-joiner-equivalent]')
    const equivalentText = button.querySelector<HTMLElement>('[data-joiner-equivalent-text]')
    if (visual) fillHeroVisual(visual, hero)
    if (caption) caption.textContent = hero?.name ?? 'Select'
    if (typeLabel) {
      typeLabel.textContent = hero ? getTroopTypeShortLabel(hero.type) : ''
      typeLabel.hidden = !hero
    }

    const pack = hero ? getJoinerPack(hero.id) : null
    const mates = hero ? getJoinerPackMates(hero.id) : []
    if (equivalent) {
      equivalent.hidden = mates.length === 0
      if (pack && mates.length > 0) {
        equivalent.title = `Same S1 (${pack.effect}): ${joinerPackNames(pack).join(', ')}`
      } else {
        equivalent.removeAttribute('title')
      }
    }
    if (equivalentText) {
      equivalentText.textContent =
        pack && mates.length > 0
          ? `Same S1 as ${mates.map((mate) => mate.name).join(', ')} (${pack.effect}).`
          : ''
    }
    button.title =
      pack && mates.length > 0
        ? `Same S1: ${joinerPackNames(pack).join(', ')} (${pack.effect})`
        : ''

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
    renderPackNote()
    closePicker()
  }

  function clearSelection(): void {
    if (!activeSlot) return
    const side = activeSlot.dataset['joinerSide'] as Side
    const index = Number(activeSlot.dataset['joinerIndex'])
    selections.delete(slotKey(side, index))
    renderSlot(activeSlot)
    renderPackNote()
    closePicker()
  }

  function renderOptions(): void {
    const query = search.value
    const allHeroes = sortJoinerHeroes(getAllHeroes(maxGeneration))
    const matching = filterHeroes(allHeroes, query)
    const heroes = expandJoinerMatches(allHeroes, matching, (hero) => hero.id)
    const current = currentSelection()
    const nodes: HTMLElement[] = []

    if (query.trim() === '') {
      nodes.push(createClearOption({ kind: 'joiner', onSelect: clearSelection }))
    }

    if (heroes.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'p-3 text-center text-p3 text-ink-muted'
      empty.textContent = 'No heroes found.'
      options.replaceChildren(empty)
      return
    }

    const groups = groupJoinerItems(heroes, (hero) => hero.id)
    for (const group of groups) {
      if (group.pack && group.items.length > 1) {
        nodes.push(
          createHeroPackOption({
            kind: 'joiner',
            pack: group.pack,
            members: group.items.map((hero) => ({
              hero,
              selected: current?.id === hero.id,
              onSelect: () => selectHero(hero),
            })),
          }),
        )
        continue
      }

      const hero = group.items[0]
      if (!hero) continue
      nodes.push(
        createHeroOption(hero, {
          kind: 'joiner',
          selected: current?.id === hero.id,
          showType: true,
          onSelect: selectHero,
        }),
      )
    }

    options.replaceChildren(...nodes)
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
    const preset = getGenerationPreset(generation)
    let hasSelection = false

    for (const slot of root.querySelectorAll<HTMLButtonElement>('[data-joiner-slot]')) {
      const side = slot.dataset['joinerSide'] as Side
      const index = Number(slot.dataset['joinerIndex'])
      const key = slotKey(side, index)
      const current = selections.get(key)
      const presetJoiners = preset ? getGenerationLineup(preset, side).joiners : []

      if (presetJoiners.length > 0 && index <= presetJoiners.length) {
        const hero = getHeroById(presetJoiners[index - 1] ?? '')
        if (hero && isHeroAvailable(hero, generation)) {
          selections.set(key, hero)
        } else {
          selections.delete(key)
        }
      } else if (presetJoiners.length > 0) {
        selections.delete(key)
      } else if (current && !isHeroAvailable(current, generation)) {
        selections.delete(key)
      }
      if (selections.has(key)) hasSelection = true
      renderSlot(slot)
    }

    renderPackNote()
    if (hasSelection) setJoinersExpanded?.(true)
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
  bindPickerKeyboard(options, 'joiner')
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
