import {
  getGenerationLineup,
  getGenerationPreset,
  onGenerationChange,
} from '../lib/generations'
import type { TroopType } from '../lib/heroes'
import {
  DEFAULT_TROOP_FC,
  DEFAULT_TROOP_RATIO,
  DEFAULT_TROOP_T12_SKILL,
  DEFAULT_TROOP_TIER,
  TROOP_FC_LEVELS,
  TROOP_T12_SKILL_NAMES,
  TROOP_T12_SKILL_LEVELS,
  TROOP_TIERS,
  allocateTroopCounts,
  formatTroopPercent,
  moveTroopRatioDivider,
  nudgeTroopRatio,
  parseTroopCount,
  sanitizeTroopCountInput,
  shiftTroopRatioMiddle,
  troopRatioPositions,
  type TroopRatio,
  type TroopRatioControl,
} from '../lib/troop-power'

interface SideState {
  total: number | null
  ratio: TroopRatio
  counts: [number, number, number] | null
}

interface DragState {
  pointerId: number
  control: TroopRatioControl
  startX: number
  initialRatio: TroopRatio
  moved: boolean
}

interface TroopSideController {
  applyLoadout: (total: number, ratio: TroopRatio) => void
}

const DRAG_THRESHOLD_PX = 4

function setPosition(element: HTMLElement | undefined, left: number, width?: number): void {
  if (!element) return
  element.style.left = `${left}%`
  if (width !== undefined) element.style.width = `${width}%`
}

function setSliderAttributes(
  element: HTMLElement | undefined,
  now: number,
  min: number,
  max: number,
  valueText: string,
): void {
  if (!element) return
  element.setAttribute('aria-valuenow', String(Math.round(now)))
  element.setAttribute('aria-valuemin', String(Math.round(min)))
  element.setAttribute('aria-valuemax', String(Math.round(Math.max(max, now))))
  element.setAttribute('aria-valuetext', valueText)
}

interface TroopLoadout {
  tier: number
  fc: number
  t12: number
  tierButton: HTMLButtonElement
  fcButton: HTMLButtonElement
  t12Button: HTMLButtonElement
  tierLabel: HTMLElement
  fcValue: HTMLElement
  t12Value: HTMLElement
  sideLabel: string
  typeId: TroopType
  typeLabel: string
}

type LoadoutField = 'tier' | 'fc' | 't12'

interface LoadoutPickerConfig {
  dialog: HTMLDialogElement
  titleElement: HTMLElement
  sideElement: HTMLElement
  options: HTMLElement
  closeButton: HTMLButtonElement
  field: LoadoutField
  values: readonly number[]
  format: (value: number) => string
  title: (loadout: TroopLoadout) => string
  columns: number
}

const PICKER_OPTION_CLASS =
  'flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-line bg-background px-2 py-2 font-primary text-p2 font-medium tabular-nums text-ink transition-colors hover:border-line-strong hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

function renderLoadout(loadout: TroopLoadout): void {
  loadout.tierLabel.textContent = `T${loadout.tier}`
  loadout.fcValue.textContent = String(loadout.fc)
  loadout.t12Value.textContent = `Lv ${loadout.t12}`
  loadout.t12Button.hidden = loadout.tier !== 12
  loadout.tierButton.setAttribute(
    'aria-label',
    `${loadout.sideLabel} ${loadout.typeLabel} tier, T${loadout.tier}`,
  )
  loadout.fcButton.setAttribute(
    'aria-label',
    `${loadout.sideLabel} ${loadout.typeLabel} fire crystal level, FC${loadout.fc}`,
  )
  loadout.t12Button.setAttribute(
    'aria-label',
    `${loadout.sideLabel} ${loadout.typeLabel} ${TROOP_T12_SKILL_NAMES[loadout.typeId]} level, Lv ${loadout.t12}`,
  )
}

function createLoadoutPicker(config: LoadoutPickerConfig): {
  open: (loadout: TroopLoadout, trigger: HTMLElement) => void
} {
  const {
    dialog,
    titleElement,
    sideElement,
    options,
    closeButton,
    field,
    values,
    format,
    title,
    columns,
  } = config
  let active: TroopLoadout | null = null
  let trigger: HTMLElement | null = null

  function currentValue(loadout: TroopLoadout): number {
    if (field === 'tier') return loadout.tier
    if (field === 'fc') return loadout.fc
    return loadout.t12
  }

  function renderOptions(loadout: TroopLoadout): void {
    const current = currentValue(loadout)
    options.replaceChildren(
      ...values.map((value) => {
        const selected = value === current
        const button = document.createElement('button')
        button.type = 'button'
        button.className = PICKER_OPTION_CLASS
        button.dataset['troopOption'] = String(value)
        button.dataset['selected'] = selected ? 'true' : 'false'
        button.setAttribute('aria-pressed', selected ? 'true' : 'false')
        button.textContent = format(value)
        button.addEventListener('click', () => {
          if (!active) return
          if (field === 'tier') active.tier = value
          else if (field === 'fc') active.fc = value
          else active.t12 = value
          renderLoadout(active)
          dialog.close()
        })
        return button
      }),
    )
  }

  function open(loadout: TroopLoadout, newTrigger: HTMLElement): void {
    active = loadout
    trigger = newTrigger
    titleElement.textContent = title(loadout)
    sideElement.textContent = `${loadout.sideLabel} side`
    renderOptions(loadout)
    dialog.showModal()

    const selected = options.querySelector<HTMLElement>('[data-selected="true"]')
    const first = options.querySelector<HTMLElement>('[data-troop-option]')
    ;(selected ?? first)?.focus()
  }

  closeButton.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    const previous = trigger
    active = null
    trigger = null
    if (!previous) return
    window.setTimeout(() => {
      if (!dialog.open && previous.isConnected) previous.focus()
    }, 0)
  })
  options.addEventListener('keydown', (event) => {
    const items = [...options.querySelectorAll<HTMLButtonElement>('[data-troop-option]')]
    const focused = document.activeElement
    if (!(focused instanceof HTMLButtonElement)) return
    const index = items.indexOf(focused)
    if (index === -1) return

    let next: number | null = null
    if (event.key === 'ArrowRight') next = Math.min(index + 1, items.length - 1)
    else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0)
    else if (event.key === 'ArrowDown') next = Math.min(index + columns, items.length - 1)
    else if (event.key === 'ArrowUp') next = Math.max(index - columns, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next === null) return

    event.preventDefault()
    items[next]?.focus()
  })

  return { open }
}

function initSide(side: HTMLElement): TroopSideController | null {
  const totalElement = side.querySelector<HTMLInputElement>('[data-troop-total]')
  const trackElement = side.querySelector<HTMLElement>('[data-troop-ratio-track]')
  if (!totalElement || !trackElement) return null
  const totalInput: HTMLInputElement = totalElement
  const track: HTMLElement = trackElement

  const fills = new Map<string, HTMLElement>()
  for (const fill of side.querySelectorAll<HTMLElement>('[data-troop-ratio-fill]')) {
    const type = fill.dataset['troopRatioFill']
    if (type) fills.set(type, fill)
  }

  const controls = new Map<TroopRatioControl, HTMLElement>()
  for (const control of side.querySelectorAll<HTMLElement>('[data-troop-ratio-control]')) {
    const name = control.dataset['troopRatioControl'] as TroopRatioControl | undefined
    if (name) controls.set(name, control)
  }

  const shares = [...side.querySelectorAll<HTMLElement>('[data-troop-share]')]
  const counts = [...side.querySelectorAll<HTMLInputElement>('input[data-troop-count]')]
  const state: SideState = { total: null, ratio: DEFAULT_TROOP_RATIO, counts: null }
  let drag: DragState | null = null

  function render(skipCount?: HTMLInputElement): void {
    const [infantry, lancer, marksman] = state.ratio
    const [first, second] = troopRatioPositions(state.ratio)
    const infantryText = formatTroopPercent(infantry)
    const lancerText = formatTroopPercent(lancer)
    const marksmanText = formatTroopPercent(marksman)

    setPosition(fills.get('infantry'), 0, infantry)
    setPosition(fills.get('lancer'), first, lancer)
    setPosition(fills.get('marksman'), second, marksman)

    const firstHandle = controls.get('infantry-lancer')
    const middleSegment = controls.get('lancer')
    const secondHandle = controls.get('lancer-marksman')

    setPosition(firstHandle, first)
    setPosition(middleSegment, first, lancer)
    setPosition(secondHandle, second)

    setSliderAttributes(
      firstHandle,
      first,
      0,
      second,
      `Infantry ${infantryText}, Lancer ${lancerText}`,
    )
    setSliderAttributes(
      middleSegment,
      infantry,
      0,
      100 - lancer,
      `Infantry ${infantryText}, Lancer fixed at ${lancerText}, Marksman ${marksmanText}`,
    )
    setSliderAttributes(
      secondHandle,
      second,
      first,
      100,
      `Lancer ${lancerText}, Marksman ${marksmanText}`,
    )

    shares.forEach((node, index) => {
      node.textContent = formatTroopPercent(state.ratio[index] ?? 0)
    })

    const totalValue = state.total === null ? '' : String(state.total)
    if (totalInput.value !== totalValue) totalInput.value = totalValue

    counts.forEach((input, index) => {
      if (input === skipCount) return
      const count = state.counts?.[index]
      const nextValue = count === undefined ? '' : String(count)
      if (input.value !== nextValue) input.value = nextValue
    })
  }

  function setRatio(next: TroopRatio): void {
    state.ratio = next
    state.counts = state.total === null ? null : allocateTroopCounts(state.total, next)
    render()
  }

  function applyLoadout(total: number, ratio: TroopRatio): void {
    state.total = total
    state.ratio = ratio
    state.counts = allocateTroopCounts(total, ratio)
    render()
  }

  function endDrag(): void {
    if (!drag) return
    const active = controls.get(drag.control)
    if (active) active.dataset['active'] = 'false'
    drag = null
  }

  function updateFromDrag(clientX: number): void {
    if (!drag) return
    if (!drag.moved && Math.abs(clientX - drag.startX) < DRAG_THRESHOLD_PX) return
    drag.moved = true

    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return

    const delta = ((clientX - drag.startX) / rect.width) * 100
    const initial = drag.initialRatio
    const [first, second] = troopRatioPositions(initial)

    if (drag.control === 'infantry-lancer') {
      setRatio(moveTroopRatioDivider(initial, 0, Math.round(first + delta)))
    } else if (drag.control === 'lancer-marksman') {
      setRatio(moveTroopRatioDivider(initial, 1, Math.round(second + delta)))
    } else {
      setRatio(shiftTroopRatioMiddle(initial, Math.round(delta)))
    }
  }

  totalInput.addEventListener('input', () => {
    const caret = totalInput.selectionStart ?? totalInput.value.length
    const edit = sanitizeTroopCountInput(totalInput.value, caret)
    if (edit.value !== totalInput.value) {
      totalInput.value = edit.value
      totalInput.setSelectionRange(edit.caret, edit.caret)
    }
    state.total = parseTroopCount(totalInput.value)
    state.counts =
      state.total === null ? null : allocateTroopCounts(state.total, state.ratio)
    render()
  })

  for (const input of counts) {
    input.addEventListener('input', () => {
      const values = counts.map((countInput) => {
        if (countInput === input) {
          const caret = countInput.selectionStart ?? countInput.value.length
          const edit = sanitizeTroopCountInput(countInput.value, caret)
          if (edit.value !== countInput.value) {
            countInput.value = edit.value
            countInput.setSelectionRange(edit.caret, edit.caret)
          }
        }
        return parseTroopCount(countInput.value)
      })

      if (values.every((value) => value === null)) {
        state.total = null
        state.counts = null
        render(input)
        return
      }

      const numbers: [number, number, number] = [
        values[0] ?? 0,
        values[1] ?? 0,
        values[2] ?? 0,
      ]
      const total = numbers[0] + numbers[1] + numbers[2]
      state.counts = numbers
      state.total = total
      if (total > 0) {
        state.ratio = [
          (numbers[0] / total) * 100,
          (numbers[1] / total) * 100,
          (numbers[2] / total) * 100,
        ]
      }
      render(input)
    })

    input.addEventListener('blur', () => {
      render()
    })
  }

  for (const [control, element] of controls) {
    element.addEventListener('keydown', (event) => {
      let direction: 1 | -1 | null = null
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        direction = -1
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        direction = 1
      }
      if (direction === null) return

      event.preventDefault()
      setRatio(nudgeTroopRatio(state.ratio, control, direction))
    })
  }

  track.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-troop-ratio-control]')
        : null
    if (!target || !track.contains(target)) return

    const control = target.dataset['troopRatioControl'] as TroopRatioControl | undefined
    if (!control) return

    event.preventDefault()
    target.focus({ preventScroll: true })
    target.dataset['active'] = 'true'
    track.setPointerCapture(event.pointerId)
    drag = {
      pointerId: event.pointerId,
      control,
      startX: event.clientX,
      initialRatio: state.ratio,
      moved: false,
    }
  })

  track.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    updateFromDrag(event.clientX)
  })

  track.addEventListener('pointerup', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId)
    }
    endDrag()
  })

  track.addEventListener('pointercancel', endDrag)
  track.addEventListener('lostpointercapture', endDrag)

  render()

  return { applyLoadout }
}

export function initTroopPower(): void {
  const section = document.querySelector<HTMLElement>('[data-troop-power]')
  if (!section) return

  const sideControllers = new Map<string, TroopSideController>()
  for (const side of section.querySelectorAll<HTMLElement>('[data-troop-power-side]')) {
    const controller = initSide(side)
    const sideId = side.dataset['troopPowerSide']
    if (controller && sideId) sideControllers.set(sideId, controller)
  }

  const tierDialog = section.querySelector<HTMLDialogElement>('#troop-tier-picker')
  const tierTitle = section.querySelector<HTMLElement>('#troop-tier-picker-title')
  const tierSide = section.querySelector<HTMLElement>('[data-troop-tier-picker-side]')
  const tierOptions = section.querySelector<HTMLElement>('[data-troop-tier-options]')
  const tierClose = section.querySelector<HTMLButtonElement>(
    '#troop-tier-picker [data-troop-picker-close]',
  )

  const fcDialog = section.querySelector<HTMLDialogElement>('#troop-fc-picker')
  const fcTitle = section.querySelector<HTMLElement>('#troop-fc-picker-title')
  const fcSide = section.querySelector<HTMLElement>('[data-troop-fc-picker-side]')
  const fcOptions = section.querySelector<HTMLElement>('[data-troop-fc-options]')
  const fcClose = section.querySelector<HTMLButtonElement>(
    '#troop-fc-picker [data-troop-picker-close]',
  )

  const t12Dialog = section.querySelector<HTMLDialogElement>('#troop-t12-picker')
  const t12Title = section.querySelector<HTMLElement>('#troop-t12-picker-title')
  const t12Side = section.querySelector<HTMLElement>('[data-troop-t12-picker-side]')
  const t12Options = section.querySelector<HTMLElement>('[data-troop-t12-options]')
  const t12Close = section.querySelector<HTMLButtonElement>(
    '#troop-t12-picker [data-troop-picker-close]',
  )

  const tierPicker =
    tierDialog && tierTitle && tierSide && tierOptions && tierClose
      ? createLoadoutPicker({
          dialog: tierDialog,
          titleElement: tierTitle,
          sideElement: tierSide,
          options: tierOptions,
          closeButton: tierClose,
          field: 'tier',
          values: TROOP_TIERS,
          format: (value) => `T${value}`,
          title: (loadout) => `Select ${loadout.typeLabel} tier`,
          columns: 4,
        })
      : null

  const fcPicker =
    fcDialog && fcTitle && fcSide && fcOptions && fcClose
      ? createLoadoutPicker({
          dialog: fcDialog,
          titleElement: fcTitle,
          sideElement: fcSide,
          options: fcOptions,
          closeButton: fcClose,
          field: 'fc',
          values: TROOP_FC_LEVELS,
          format: (value) => `FC${value}`,
          title: (loadout) => `Select ${loadout.typeLabel} FC level`,
          columns: 4,
        })
      : null

  const t12Picker =
    t12Dialog && t12Title && t12Side && t12Options && t12Close
      ? createLoadoutPicker({
          dialog: t12Dialog,
          titleElement: t12Title,
          sideElement: t12Side,
          options: t12Options,
          closeButton: t12Close,
          field: 't12',
          values: TROOP_T12_SKILL_LEVELS,
          format: (value) => `Lv ${value}`,
          title: (loadout) =>
            `${TROOP_T12_SKILL_NAMES[loadout.typeId]} Level: ${loadout.t12}`,
          columns: 5,
        })
      : null

  const loadouts = new Map<string, TroopLoadout>()

  for (const card of section.querySelectorAll<HTMLElement>('[data-troop-type]')) {
    const tierButton = card.querySelector<HTMLButtonElement>('[data-troop-tier-slot]')
    const fcButton = card.querySelector<HTMLButtonElement>('[data-troop-fc-slot]')
    const t12Button = card.querySelector<HTMLButtonElement>('[data-troop-t12-slot]')
    const tierLabel = card.querySelector<HTMLElement>('[data-troop-tier-label]')
    const fcValue = card.querySelector<HTMLElement>('[data-troop-fc-value]')
    const t12Value = card.querySelector<HTMLElement>('[data-troop-t12-value]')
    const typeId = card.dataset['troopType'] as TroopType | undefined
    if (
      !tierButton ||
      !fcButton ||
      !t12Button ||
      !tierLabel ||
      !fcValue ||
      !t12Value ||
      !typeId
    ) {
      continue
    }

    const loadout: TroopLoadout = {
      tier: DEFAULT_TROOP_TIER,
      fc: DEFAULT_TROOP_FC,
      t12: DEFAULT_TROOP_T12_SKILL,
      tierButton,
      fcButton,
      t12Button,
      tierLabel,
      fcValue,
      t12Value,
      sideLabel: card.dataset['troopSideLabel'] ?? 'Left',
      typeId,
      typeLabel: card.dataset['troopTypeLabel'] ?? 'Troop',
    }
    renderLoadout(loadout)

    const sideId = card.closest<HTMLElement>('[data-troop-power-side]')?.dataset[
      'troopPowerSide'
    ]
    if (sideId) loadouts.set(`${sideId}:${typeId}`, loadout)

    if (tierPicker) {
      tierButton.addEventListener('click', () => tierPicker.open(loadout, tierButton))
    }
    if (fcPicker) {
      fcButton.addEventListener('click', () => fcPicker.open(loadout, fcButton))
    }
    if (t12Picker) {
      t12Button.addEventListener('click', () => t12Picker.open(loadout, t12Button))
    }
  }

  onGenerationChange((generation) => {
    const preset = getGenerationPreset(generation)
    if (!preset) return

    for (const [side, controller] of sideControllers) {
      const lineup = getGenerationLineup(preset, side === 'right' ? 'right' : 'left')
      controller.applyLoadout(preset.totalTroops, lineup.ratio)
    }

    for (const loadout of loadouts.values()) {
      loadout.tier = preset.tier
      loadout.fc = preset.fc
      loadout.t12 = 0
      renderLoadout(loadout)
    }
  })
}
