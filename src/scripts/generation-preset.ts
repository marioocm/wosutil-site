import {
  dispatchGenerationChange,
  type GenerationPreset,
} from '../lib/generations'

const COLUMNS = 3
const OPTION_CLASS =
  'flex min-h-[3.5rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm border border-line bg-background px-2 py-2 text-center transition-colors hover:border-line-strong hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
const LABEL_CLASS = 'font-primary text-p2 font-medium leading-none tabular-nums'
const META_CLASS = 'font-mono text-[10px] leading-none text-ink-muted'

export function initGenerationPreset(presets: readonly GenerationPreset[]): void {
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

  function createOption(preset: GenerationPreset): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = OPTION_CLASS
    button.dataset['generationOption'] = String(preset.generation)
    button.dataset['selected'] = 'false'
    button.setAttribute('aria-pressed', 'false')

    const label = document.createElement('span')
    label.className = LABEL_CLASS
    label.textContent = `Gen ${preset.generation}`

    const meta = document.createElement('span')
    meta.className = META_CLASS
    meta.textContent = `T${preset.tier} · FC${preset.fc}`

    button.append(label, meta)
    return button
  }

  if (presets.length === 0) {
    const status = document.createElement('p')
    status.className = 'col-span-3 px-1 py-2 text-micro leading-snug text-ink-muted'
    status.textContent = 'Generation data unavailable.'
    optionList.replaceChildren(status)
    triggerButton.disabled = true
    triggerButton.setAttribute('aria-label', 'Generation data unavailable')
    return
  }

  triggerButton.disabled = false
  optionList.replaceChildren(...presets.map(createOption))

  function selectGeneration(generation: number): void {
    if (!presets.some((preset) => preset.generation === generation)) return

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
