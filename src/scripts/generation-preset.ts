import {
  dispatchGenerationChange,
  MAX_GENERATION,
  MIN_GENERATION,
} from '../lib/generations'

const COLUMNS = 3

export function initGenerationPreset(): void {
  const section = document.querySelector<HTMLElement>('[data-generation-preset]')
  if (!section) return

  const trigger = section.querySelector<HTMLButtonElement>('[data-generation-trigger]')
  const value = section.querySelector<HTMLElement>('[data-generation-value]')
  const dialog = section.querySelector<HTMLDialogElement>('#generation-picker')
  const options = section.querySelector<HTMLElement>('[data-generation-options]')
  const closeButton = section.querySelector<HTMLButtonElement>('[data-generation-close]')
  if (!trigger || !value || !dialog || !options || !closeButton) return

  const triggerButton: HTMLButtonElement = trigger
  const valueElement: HTMLElement = value
  const picker: HTMLDialogElement = dialog
  const optionList: HTMLElement = options

  let selectedGeneration: number | null = null

  function optionButtons(): HTMLButtonElement[] {
    return [...optionList.querySelectorAll<HTMLButtonElement>('[data-generation-option]')]
  }

  function syncOptions(): void {
    for (const button of optionButtons()) {
      const selected = Number(button.dataset['generationOption']) === selectedGeneration
      button.dataset['selected'] = selected ? 'true' : 'false'
      button.setAttribute('aria-pressed', selected ? 'true' : 'false')
    }
  }

  function selectGeneration(generation: number): void {
    if (
      !Number.isInteger(generation) ||
      generation < MIN_GENERATION ||
      generation > MAX_GENERATION
    ) {
      return
    }

    selectedGeneration = generation
    valueElement.textContent = `Gen ${generation}`
    triggerButton.dataset['selected'] = 'true'
    triggerButton.setAttribute('aria-label', `Choose your current Generation: Gen ${generation}`)
    syncOptions()
    dispatchGenerationChange(generation)
    if (picker.open) picker.close()
  }

  function openPicker(): void {
    syncOptions()
    picker.showModal()

    const selected = optionList.querySelector<HTMLButtonElement>('[data-selected="true"]')
    const first = optionButtons()[0]
    ;(selected ?? first)?.focus()
  }

  triggerButton.addEventListener('click', openPicker)
  closeButton.addEventListener('click', () => picker.close())

  optionList.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>('[data-generation-option]')
    if (!button) return

    const generation = Number(button.dataset['generationOption'])
    selectGeneration(generation)
  })

  optionList.addEventListener('keydown', (event) => {
    const items = optionButtons()
    const focused = document.activeElement
    if (!(focused instanceof HTMLButtonElement)) return
    const index = items.indexOf(focused)
    if (index === -1) return

    let next: number | null = null
    if (event.key === 'ArrowRight') next = Math.min(index + 1, items.length - 1)
    else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0)
    else if (event.key === 'ArrowDown') next = Math.min(index + COLUMNS, items.length - 1)
    else if (event.key === 'ArrowUp') next = Math.max(index - COLUMNS, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next === null) return

    event.preventDefault()
    items[next]?.focus()
  })

  picker.addEventListener('click', (event) => {
    if (event.target === picker) picker.close()
  })
  picker.addEventListener('close', () => {
    triggerButton.focus()
  })
}
