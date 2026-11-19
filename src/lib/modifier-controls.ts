import {
  GARETH_MAX,
  cityBuffs,
  cityLevel,
  emptyBuffs,
  maxPets,
  normalizeBuffs,
  petsEnabled,
  type SideBuffs,
} from './stat-buffs'

export type ModifierSide = 'left' | 'right'

export interface ModifierChangeDetail {
  side: ModifierSide
}

export const MODIFIER_CHANGE_EVENT = 'wosutil:modifiers-change'

function notifyModifierChange(side: ModifierSide): void {
  document.dispatchEvent(
    new CustomEvent<ModifierChangeDetail>(MODIFIER_CHANGE_EVENT, { detail: { side } }),
  )
}

export function onModifierChange(listener: (detail: ModifierChangeDetail) => void): void {
  document.addEventListener(MODIFIER_CHANGE_EVENT, (event) => {
    const detail = (event as CustomEvent<ModifierChangeDetail>).detail
    if (!detail || !detail.side) return
    listener(detail)
  })
}

const CITY_VALUE_ATTR = 'cityValues'
const PET_VALUE_ATTR = 'petValues'

function modifierRoot(root: ParentNode, side: ModifierSide): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-modifiers-side="${side}"]`)
}

function parseValues<T extends string>(raw: string | undefined): Partial<Record<T, number>> | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    return typeof value === 'object' && value !== null
      ? (value as Partial<Record<T, number>>)
      : null
  } catch {
    return null
  }
}

function readGareth(container: HTMLElement): number {
  const input = container.querySelector<HTMLInputElement>('[data-gareth]')
  if (input) return Number(input.value)
  return Number(container.dataset['gareth'])
}

export function readModifierControls(
  root: ParentNode,
  side: ModifierSide,
): SideBuffs {
  const container = modifierRoot(root, side)
  if (!container) return emptyBuffs()

  const cityValues = parseValues(container.dataset[CITY_VALUE_ATTR])
  const petValues = parseValues(container.dataset[PET_VALUE_ATTR])
  const city = cityValues
    ? normalizeBuffs({ city: cityValues as SideBuffs['city'] }).city
    : cityBuffs(Number(container.dataset['city']))
  const pets = petValues
    ? normalizeBuffs({ pets: petValues as SideBuffs['pets'] }).pets
    : maxPets(container.dataset['pets'] === 'true')
  return normalizeBuffs({ city, pets, gareth: readGareth(container) })
}

export function applyModifierControls(
  root: ParentNode,
  side: ModifierSide,
  buffs: Partial<SideBuffs>,
): void {
  const container = modifierRoot(root, side)
  if (!container) return
  const state = normalizeBuffs(buffs)
  const level = cityLevel(state.city)

  container.dataset['city'] = String(level)
  container.dataset[CITY_VALUE_ATTR] = JSON.stringify(state.city)
  container.dataset['pets'] = petsEnabled(state.pets) ? 'true' : 'false'
  container.dataset[PET_VALUE_ATTR] = JSON.stringify(state.pets)
  container.dataset['gareth'] = String(state.gareth)

  const gareth = container.querySelector<HTMLInputElement>('[data-gareth]')
  if (gareth) gareth.value = String(state.gareth)

  const pets = container.querySelector<HTMLInputElement>('[data-pets-toggle]')
  if (pets) pets.checked = petsEnabled(state.pets)

  for (const button of container.querySelectorAll<HTMLButtonElement>('[data-city-preset]')) {
    const active = Number(button.dataset['cityPreset']) === level
    button.dataset['active'] = active ? 'true' : 'false'
    button.setAttribute('aria-pressed', active ? 'true' : 'false')
  }

  updateModifierSummary(container, state)
}

export function modifierSummary(buffs: SideBuffs): string {
  const level = cityLevel(buffs.city)
  const pets = petsEnabled(buffs.pets)
  const gareth = buffs.gareth > 0 ? ` · Gareth ${formatPercent(buffs.gareth)}` : ''
  return `City ${level > 0 ? `${level}%` : 'off'} · Pets ${pets ? 'on' : 'off'}${gareth}`
}

function updateModifierSummary(container: HTMLElement, buffs: SideBuffs): void {
  const summary = container.querySelector<HTMLElement>('[data-modifier-summary]')
  if (summary) summary.textContent = modifierSummary(buffs)
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2)}%`
}

export function initModifierControls(): void {
  for (const container of document.querySelectorAll<HTMLElement>('[data-modifiers-side]')) {
    const side = container.dataset['modifiersSide'] as ModifierSide
    applyModifierControls(document, side, readModifierControls(document, side))

    container.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return
      const button = event.target.closest<HTMLButtonElement>('[data-city-preset]')
      if (!button) return
      const current = readModifierControls(document, side)
      applyModifierControls(document, side, {
        ...current,
        city: cityBuffs(Number(button.dataset['cityPreset'])),
      })
      notifyModifierChange(side)
    })

    const pets = container.querySelector<HTMLInputElement>('[data-pets-toggle]')
    pets?.addEventListener('change', () => {
      const current = readModifierControls(document, side)
      applyModifierControls(document, side, {
        ...current,
        pets: maxPets(pets.checked),
      })
      notifyModifierChange(side)
    })

    const gareth = container.querySelector<HTMLInputElement>('[data-gareth]')
    gareth?.addEventListener('change', () => {
      const current = readModifierControls(document, side)
      applyModifierControls(document, side, {
        ...current,
        gareth: Math.min(Math.max(Number(gareth.value) || 0, 0), GARETH_MAX),
      })
      notifyModifierChange(side)
    })
  }
}
