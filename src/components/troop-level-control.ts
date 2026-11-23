import { TROOP_FC_LEVELS, TROOP_TIERS } from '../lib/troop-power'

export interface TroopLevelValue {
  tier: number | null
  fc: number | null
}

export interface TroopLevelControlOptions {
  /** Caption shown above the tile ("Min" or "Max"). */
  label: string
  value: TroopLevelValue
  onChange: (value: TroopLevelValue) => void
}

export interface TroopLevelControl {
  readonly element: HTMLElement
  readonly value: TroopLevelValue
  setValue(value: TroopLevelValue, silent?: boolean): void
}

type LevelField = 'tier' | 'fc'

const TILE_CLASS =
  'relative flex aspect-square w-full cursor-pointer items-center justify-center rounded-sm border border-line bg-background p-0 transition-colors hover:border-line-strong hover:bg-tint/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
const TILE_LABEL_CLASS =
  'pointer-events-none absolute left-1.5 top-1.5 text-[9px] font-medium leading-none tracking-[0.06em] text-ink-muted'
const TILE_VALUE_CLASS =
  'pointer-events-none font-primary text-p1 font-medium leading-none tabular-nums text-ink'
const TILE_ANY_CLASS =
  'pointer-events-none font-primary text-p2 font-medium leading-none text-ink-muted'
const FC_BUTTON_CLASS =
  'troop-fc-badge absolute z-20 flex cursor-pointer items-center justify-center rounded-full transition-shadow hover:ring-2 hover:ring-ink/20 focus-visible:ring-2 focus-visible:ring-ink/30'
const PICKER_OPTION_CLASS =
  'flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-line bg-background px-2 py-2 font-primary text-p2 font-medium tabular-nums text-ink transition-colors hover:border-line-strong hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
const PICKER_ANY_CLASS = `${PICKER_OPTION_CLASS} col-span-full min-h-10`

let pickerSequence = 0

function closeIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.4')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'm4 4 8 8M12 4l-8 8')
  svg.append(path)
  return svg
}

function optionButton(label: string, value: number | null, any: boolean): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = any ? PICKER_ANY_CLASS : PICKER_OPTION_CLASS
  button.dataset['troopOption'] = value === null ? 'any' : String(value)
  button.dataset['selected'] = 'false'
  button.setAttribute('aria-pressed', 'false')
  button.textContent = label
  return button
}

/**
 * Tier tile plus overlapping FC hexagon with an optional "Any" value.
 *
 * The archive uses two instances (minimum and maximum) and the same visual
 * language as the simulator's Troop Power tiles.
 */
export function createTroopLevelControl(
  options: TroopLevelControlOptions,
): TroopLevelControl {
  let current: TroopLevelValue = { tier: options.value.tier, fc: options.value.fc }
  let activeField: LevelField = 'tier'
  let activeTrigger: HTMLButtonElement | null = null

  const dialog = document.createElement('dialog')
  const pickerId = `troop-level-picker-${++pickerSequence}`
  const titleId = `${pickerId}-title`
  dialog.id = pickerId
  dialog.className =
    'troop-picker m-auto max-h-[min(80dvh,38rem)] w-[min(20rem,calc(100vw-2rem))] rounded-card border border-line bg-paper p-0 text-ink'
  dialog.setAttribute('aria-labelledby', titleId)

  const shell = document.createElement('div')
  shell.className = 'flex max-h-[inherit] flex-col'

  const header = document.createElement('div')
  header.className = 'flex items-start justify-between gap-4 border-b border-line px-5 py-4'

  const copy = document.createElement('div')
  copy.className = 'min-w-0'

  const title = document.createElement('h3')
  title.id = titleId
  title.className = 'text-p1 font-medium tracking-[-0.01em]'

  const subtitle = document.createElement('p')
  subtitle.className = 'text-micro text-ink-muted'

  const close = document.createElement('button')
  close.type = 'button'
  close.className =
    'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line bg-transparent text-ink transition-colors hover:border-line-strong hover:bg-tint/50 active:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
  close.setAttribute('aria-label', 'Close')
  close.append(closeIcon())

  const optionsRoot = document.createElement('div')
  optionsRoot.className =
    'grid min-h-0 flex-1 grid-cols-4 content-start gap-1.5 overflow-y-auto overscroll-contain p-3'

  copy.append(title, subtitle)
  header.append(copy, close)
  shell.append(header, optionsRoot)
  dialog.append(shell)
  document.body.append(dialog)

  const element = document.createElement('div')
  element.className = 'grid min-w-0 justify-items-center gap-1.5'
  element.dataset['troopLevelControl'] = options.label.toLowerCase()

  const caption = document.createElement('span')
  caption.className =
    'text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle'
  caption.textContent = options.label

  const tile = document.createElement('div')
  tile.className = 'relative w-full max-w-[4.5rem]'

  const tierButton = document.createElement('button')
  tierButton.type = 'button'
  tierButton.className = TILE_CLASS
  tierButton.dataset['troopLevelTrigger'] = 'tier'
  tierButton.setAttribute('aria-haspopup', 'dialog')
  tierButton.setAttribute('aria-controls', dialog.id)

  const tierLabel = document.createElement('span')
  tierLabel.className = TILE_LABEL_CLASS
  tierLabel.textContent = 'TIER'

  const tierValue = document.createElement('span')

  const fcButton = document.createElement('button')
  fcButton.type = 'button'
  fcButton.className = FC_BUTTON_CLASS
  fcButton.dataset['troopLevelTrigger'] = 'fc'
  fcButton.setAttribute('aria-haspopup', 'dialog')
  fcButton.setAttribute('aria-controls', dialog.id)

  const fcHex = document.createElement('span')
  fcHex.className = 'troop-fc-hex pointer-events-none'
  fcHex.setAttribute('aria-hidden', 'true')

  const fcValue = document.createElement('span')
  fcValue.className = 'troop-fc-value'

  tierButton.append(tierLabel, tierValue)
  fcHex.append(fcValue)
  fcButton.append(fcHex)
  tile.append(tierButton, fcButton)
  element.append(caption, tile)

  function render(): void {
    const hasTier = current.tier !== null
    tierValue.textContent = hasTier ? `T${current.tier}` : 'Any'
    tierValue.className = hasTier ? TILE_VALUE_CLASS : TILE_ANY_CLASS
    tierButton.dataset['selected'] = hasTier ? 'true' : 'false'
    tierButton.setAttribute(
      'aria-label',
      `${options.label} tier: ${hasTier ? `T${current.tier}` : 'Any'}`,
    )

    const hasFc = current.fc !== null
    fcValue.textContent = hasFc ? String(current.fc) : '—'
    fcHex.classList.toggle('is-any', !hasFc)
    fcButton.setAttribute(
      'aria-label',
      `${options.label} fire crystal level: ${hasFc ? `FC${current.fc}` : 'Any'}`,
    )
  }

  function select(field: LevelField, value: number | null): void {
    current =
      field === 'tier' ? { ...current, tier: value } : { ...current, fc: value }
    render()
    dialog.close()
    options.onChange({ ...current })
  }

  function renderOptions(): void {
    const values = activeField === 'tier' ? TROOP_TIERS : TROOP_FC_LEVELS
    const selected = activeField === 'tier' ? current.tier : current.fc
    const any = optionButton(
      activeField === 'tier' ? 'Any tier' : 'Any FC level',
      null,
      true,
    )
    any.dataset['selected'] = selected === null ? 'true' : 'false'
    any.setAttribute('aria-pressed', selected === null ? 'true' : 'false')
    any.addEventListener('click', () => select(activeField, null))

    const buttons = values.map((value) => {
      const button = optionButton(
        activeField === 'tier' ? `T${value}` : `FC${value}`,
        value,
        false,
      )
      const isSelected = selected === value
      button.dataset['selected'] = isSelected ? 'true' : 'false'
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
      button.addEventListener('click', () => select(activeField, value))
      return button
    })

    optionsRoot.replaceChildren(any, ...buttons)
  }

  function openPicker(field: LevelField, trigger: HTMLButtonElement): void {
    activeField = field
    activeTrigger = trigger
    title.textContent = `${options.label} ${field === 'tier' ? 'tier' : 'FC level'}`
    subtitle.textContent =
      field === 'tier'
        ? 'Any clears this bound.'
        : 'Any clears this bound · FC0 means no fire crystal.'
    renderOptions()
    dialog.showModal()

    const selected = optionsRoot.querySelector<HTMLButtonElement>(
      '[data-troop-option][data-selected="true"]',
    )
    const first = optionsRoot.querySelector<HTMLButtonElement>('[data-troop-option]')
    ;(selected ?? first)?.focus()
  }

  tierButton.addEventListener('click', () => openPicker('tier', tierButton))
  fcButton.addEventListener('click', () => openPicker('fc', fcButton))
  close.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    const trigger = activeTrigger
    activeTrigger = null
    if (trigger?.isConnected) window.setTimeout(() => trigger.focus(), 0)
  })

  optionsRoot.addEventListener('keydown', (event) => {
    const items = [...optionsRoot.querySelectorAll<HTMLButtonElement>('[data-troop-option]')]
    const focused = document.activeElement
    if (!(focused instanceof HTMLButtonElement)) return
    const index = items.indexOf(focused)
    if (index === -1) return

    const anyIndex = items.findIndex(
      (item) => item.dataset['troopOption'] === 'any',
    )
    const gridStart = anyIndex === 0 ? 1 : 0
    let next: number | null = null

    if (event.key === 'ArrowRight') next = Math.min(index + 1, items.length - 1)
    else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0)
    else if (event.key === 'ArrowDown') {
      next =
        index === anyIndex ? gridStart : Math.min(index + 4, items.length - 1)
    } else if (event.key === 'ArrowUp') {
      if (index === anyIndex) next = anyIndex
      else if (anyIndex === 0 && index < gridStart + 4) next = anyIndex
      else next = Math.max(index - 4, gridStart)
    } else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next === null) return

    event.preventDefault()
    items[next]?.focus()
  })

  render()

  return {
    element,
    get value() {
      return { ...current }
    },
    setValue(value: TroopLevelValue, silent = false): void {
      current = { tier: value.tier, fc: value.fc }
      render()
      if (!silent) options.onChange({ ...current })
    },
  }
}
