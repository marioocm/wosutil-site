import {
  getGenerationLineup,
  getGenerationPreset,
  onGenerationChange,
} from '../lib/generations'
import { TROOP_TYPES, type TroopType } from '../lib/heroes'
import { onSimulatorLoad, type SimulatorTroopLoadout } from '../lib/simulator-load'
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
  troopClassShares,
  troopRatioPositions,
  type TroopRatio,
  type TroopRatioControl,
} from '../lib/troop-power'

interface LevelControl {
  tier: number
  fc: number
  sideLabel: string
  typeLabel: string
  tierButton: HTMLButtonElement
  fcButton: HTMLButtonElement
  tierLabel: HTMLElement
  fcValue: HTMLElement
}

interface T12Control {
  level: number
  sideLabel: string
  typeId: TroopType
  typeLabel: string
  button: HTMLButtonElement
  value: HTMLElement
}

interface RowControl {
  element: HTMLElement
  header: HTMLElement | null
  label: HTMLElement | null
  removeButton: HTMLButtonElement | null
  levels: Map<TroopType, LevelControl>
  counts: Map<TroopType, HTMLInputElement>
}

interface PickerTarget {
  sideLabel: string
  title: string
  value: number
  setValue: (value: number) => void
}

interface LoadoutPicker {
  open: (target: PickerTarget, trigger: HTMLElement) => void
}

interface Pickers {
  tier: LoadoutPicker | null
  fc: LoadoutPicker | null
  t12: LoadoutPicker | null
}

interface SideController {
  applyPreset: (
    total: number,
    ratio: TroopRatio,
    tier: number,
    fc: number,
    t12: number,
  ) => void
  applyTroops: (troops: Record<TroopType, SimulatorTroopLoadout>) => void
}

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

interface LoadoutPickerConfig {
  dialog: HTMLDialogElement
  titleElement: HTMLElement
  sideElement: HTMLElement
  options: HTMLElement
  closeButton: HTMLButtonElement
  values: readonly number[]
  format: (value: number) => string
  columns: number
}

const DRAG_THRESHOLD_PX = 4

const PICKER_OPTION_CLASS =
  'flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-line bg-background px-2 py-2 font-primary text-p2 font-medium tabular-nums text-ink transition-colors hover:border-line-strong hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

function setPosition(
  element: HTMLElement | undefined,
  left: number,
  width?: number,
): void {
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

function parseLabeledInt(raw: string | null | undefined, fallback: number): number {
  const match = (raw ?? '').match(/\d+/)
  return match ? Number(match[0]) : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function renderLevel(level: LevelControl): void {
  level.tierLabel.textContent = `T${level.tier}`
  level.fcValue.textContent = String(level.fc)
  level.tierButton.setAttribute(
    'aria-label',
    `${level.sideLabel} ${level.typeLabel} tier, T${level.tier}`,
  )
  level.fcButton.setAttribute(
    'aria-label',
    `${level.sideLabel} ${level.typeLabel} fire crystal level, FC${level.fc}`,
  )
}

function renderT12(control: T12Control): void {
  control.value.textContent = `Lv ${control.level}`
  control.button.setAttribute(
    'aria-label',
    `${control.sideLabel} ${control.typeLabel} ${TROOP_T12_SKILL_NAMES[control.typeId]} level, Lv ${control.level}`,
  )
}

function createLoadoutPicker(config: LoadoutPickerConfig): LoadoutPicker {
  const {
    dialog,
    titleElement,
    sideElement,
    options,
    closeButton,
    values,
    format,
    columns,
  } = config
  let active: PickerTarget | null = null
  let trigger: HTMLElement | null = null

  function renderOptions(target: PickerTarget): void {
    options.replaceChildren(
      ...values.map((value) => {
        const selected = value === target.value
        const button = document.createElement('button')
        button.type = 'button'
        button.className = PICKER_OPTION_CLASS
        button.dataset['troopOption'] = String(value)
        button.dataset['selected'] = selected ? 'true' : 'false'
        button.setAttribute('aria-pressed', selected ? 'true' : 'false')
        button.textContent = format(value)
        button.addEventListener('click', () => {
          if (!active) return
          active.setValue(value)
          dialog.close()
        })
        return button
      }),
    )
  }

  function open(target: PickerTarget, newTrigger: HTMLElement): void {
    active = target
    trigger = newTrigger
    titleElement.textContent = target.title
    sideElement.textContent = `${target.sideLabel} side`
    renderOptions(target)
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

function initSide(
  side: HTMLElement,
  pickers: Pickers,
  reduceMotion: MediaQueryList,
): SideController | null {
  const totalElement = side.querySelector<HTMLInputElement>('[data-troop-total]')
  const trackElement = side.querySelector<HTMLElement>('[data-troop-ratio-track]')
  const rowsElement = side.querySelector<HTMLElement>('[data-troop-rows]')
  const addButton = side.querySelector<HTMLButtonElement>('[data-troop-add-row]')
  const ratioNote = side.querySelector<HTMLElement>('[data-troop-ratio-note]')
  if (
    !totalElement ||
    !trackElement ||
    !rowsElement ||
    !addButton ||
    !ratioNote ||
    !rowsElement.querySelector<HTMLElement>('[data-troop-row]')
  ) {
    return null
  }
  const totalInput: HTMLInputElement = totalElement
  const track: HTMLElement = trackElement
  const rowsRoot: HTMLElement = rowsElement
  const addRowButton: HTMLButtonElement = addButton
  const note: HTMLElement = ratioNote
  const sideLabel = side.dataset['troopPowerLabel'] ?? 'Attacker'

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
  const state: SideState = {
    total: null,
    ratio: DEFAULT_TROOP_RATIO,
    counts: null,
  }
  const rows: RowControl[] = []
  const t12 = new Map<TroopType, T12Control>()
  let mixed = false
  let drag: DragState | null = null

  const firstRow = rowsRoot.querySelector<HTMLElement>('[data-troop-row]')
  if (!firstRow) return null

  function refreshT12Visibility(): void {
    for (const [typeId, control] of t12) {
      const hasT12 = rows.some((row) => row.levels.get(typeId)?.tier === 12)
      control.button.hidden = !hasT12
    }
  }

  function updateRowHeader(row: RowControl, index: number): void {
    const extra = index > 0
    row.header?.classList.toggle('hidden', !extra)
    row.header?.classList.toggle('flex', extra)
    row.element.classList.toggle('border-t', extra)
    row.element.classList.toggle('border-line', extra)
    row.element.classList.toggle('pt-3', extra)
    row.element.setAttribute('role', 'group')
    row.element.setAttribute(
      'aria-label',
      `${sideLabel} troop row ${index + 1}`,
    )
    if (row.label) row.label.textContent = `Row ${index + 1}`
    if (row.removeButton) {
      row.removeButton.hidden = !extra
      row.removeButton.setAttribute(
        'aria-label',
        `Remove ${sideLabel} troop row ${index + 1}`,
      )
    }
  }

  function updateRowLabels(): void {
    rows.forEach((row, index) => {
      for (const { id } of TROOP_TYPES) {
        const input = row.counts.get(id)
        const label = row.levels.get(id)?.typeLabel ?? 'Troop'
        input?.setAttribute(
          'aria-label',
          `${sideLabel} ${label} troop count, row ${index + 1}`,
        )
      }
    })
  }

  function rowCount(row: RowControl, type: TroopType): number | null {
    return parseTroopCount(row.counts.get(type)?.value)
  }

  function classTotals(): [number, number, number] {
    return TROOP_TYPES.map(({ id }) =>
      rows.reduce((sum, row) => sum + (rowCount(row, id) ?? 0), 0),
    ) as [number, number, number]
  }

  function renderChrome(): void {
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

    track.setAttribute(
      'aria-label',
      mixed
        ? `${sideLabel} troop ratio, Infantry ${infantryText}, Lancer ${lancerText}, Marksman ${marksmanText}`
        : `${sideLabel} troop ratio`,
    )
  }

  function writeSingleRowCounts(): void {
    if (mixed) return
    const row = rows[0]
    if (!row) return
    for (const [index, { id }] of TROOP_TYPES.entries()) {
      const input = row.counts.get(id)
      if (!input) continue
      const count = state.counts?.[index]
      const nextValue =
        count === undefined || count === null ? '' : String(count)
      if (input.value !== nextValue) input.value = nextValue
    }
  }

  function syncFromCounts(): void {
    if (!mixed) {
      const row = rows[0]
      if (!row) return
      const values = TROOP_TYPES.map(({ id }) => rowCount(row, id))
      if (values.every((value) => value === null)) {
        state.total = null
        state.counts = null
        renderChrome()
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
      if (total > 0) state.ratio = troopClassShares(numbers)
      renderChrome()
      return
    }

    const totals = classTotals()
    const total = totals[0] + totals[1] + totals[2]
    state.total = total > 0 ? total : null
    state.ratio = total > 0 ? troopClassShares(totals) : DEFAULT_TROOP_RATIO
    renderChrome()
  }

  function applyRowMode(): void {
    mixed = rows.length > 1
    side.dataset['troopMixed'] = mixed ? 'true' : 'false'
    totalInput.readOnly = mixed
    if (mixed) {
      totalInput.setAttribute('aria-readonly', 'true')
      totalInput.setAttribute(
        'aria-label',
        `${sideLabel} total troops, sum of every row`,
      )
      totalInput.title = 'Sum of every troop row'
      track.setAttribute(
        'aria-description',
        'The ratio follows the troop rows and cannot be adjusted.',
      )
    } else {
      totalInput.removeAttribute('aria-readonly')
      totalInput.setAttribute('aria-label', `${sideLabel} total troops`)
      totalInput.removeAttribute('title')
      track.removeAttribute('aria-description')
    }

    for (const control of controls.values()) {
      if (mixed) {
        control.setAttribute('aria-disabled', 'true')
        control.tabIndex = -1
      } else {
        control.removeAttribute('aria-disabled')
        control.tabIndex = 0
      }
    }

    note.hidden = !mixed
    rows.forEach((row, index) => updateRowHeader(row, index))
    updateRowLabels()
    refreshT12Visibility()
    renderChrome()
  }

  function clearCounts(row: RowControl): void {
    for (const input of row.counts.values()) input.value = ''
  }

  function appendRow(): RowControl | null {
    const source = rows[0]?.element
    if (!source) return null
    const clone = source.cloneNode(true) as HTMLElement
    for (const t12Button of clone.querySelectorAll('[data-troop-t12-slot]')) {
      t12Button.remove()
    }
    clone.dataset['troopRowIndex'] = String(rows.length)
    rowsRoot.append(clone)

    const seed = rows.at(-1)?.levels
    const row = initRow(clone, rows.length, seed)
    clearCounts(row)
    rows.push(row)
    return row
  }

  function addRow(): void {
    const row = appendRow()
    if (!row) return
    applyRowMode()
    syncFromCounts()
    row.element.scrollIntoView({
      block: 'nearest',
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    })
  }

  function removeRow(row: RowControl): void {
    const index = rows.indexOf(row)
    if (index <= 0) return
    rows.splice(index, 1)
    row.element.remove()
    applyRowMode()
    syncFromCounts()
    addRowButton.focus()
  }

  function initRow(
    element: HTMLElement,
    index: number,
    seed?: ReadonlyMap<TroopType, { tier: number; fc: number }>,
  ): RowControl {
    const header = element.querySelector<HTMLElement>('[data-troop-row-header]')
    const label = element.querySelector<HTMLElement>('[data-troop-row-label]')
    const removeButton = element.querySelector<HTMLButtonElement>(
      '[data-troop-remove-row]',
    )
    const levels = new Map<TroopType, LevelControl>()
    const counts = new Map<TroopType, HTMLInputElement>()

    for (const card of element.querySelectorAll<HTMLElement>('[data-troop-type]')) {
      const typeId = card.dataset['troopType'] as TroopType | undefined
      const typeLabel = card.dataset['troopTypeLabel'] ?? 'Troop'
      const tierButton = card.querySelector<HTMLButtonElement>('[data-troop-tier-slot]')
      const fcButton = card.querySelector<HTMLButtonElement>('[data-troop-fc-slot]')
      const tierLabel = card.querySelector<HTMLElement>('[data-troop-tier-label]')
      const fcValue = card.querySelector<HTMLElement>('[data-troop-fc-value]')
      const countInput = card.querySelector<HTMLInputElement>('input[data-troop-count]')
      if (
        !typeId ||
        !tierButton ||
        !fcButton ||
        !tierLabel ||
        !fcValue ||
        !countInput
      ) {
        continue
      }

      const seedLevel = seed?.get(typeId)
      const level: LevelControl = {
        tier:
          seedLevel?.tier ??
          parseLabeledInt(tierLabel.textContent, DEFAULT_TROOP_TIER),
        fc:
          seedLevel?.fc ??
          parseLabeledInt(fcValue.textContent, DEFAULT_TROOP_FC),
        sideLabel,
        typeLabel,
        tierButton,
        fcButton,
        tierLabel,
        fcValue,
      }
      renderLevel(level)
      levels.set(typeId, level)
      counts.set(typeId, countInput)

      tierButton.addEventListener('click', () => {
        pickers.tier?.open(
          {
            sideLabel,
            title: `Select ${typeLabel} tier`,
            value: level.tier,
            setValue: (value) => {
              level.tier = value
              renderLevel(level)
              refreshT12Visibility()
            },
          },
          tierButton,
        )
      })

      fcButton.addEventListener('click', () => {
        pickers.fc?.open(
          {
            sideLabel,
            title: `Select ${typeLabel} FC level`,
            value: level.fc,
            setValue: (value) => {
              level.fc = value
              renderLevel(level)
            },
          },
          fcButton,
        )
      })
    }

    const control: RowControl = {
      element,
      header,
      label,
      removeButton,
      levels,
      counts,
    }
    if (index > 0) {
      removeButton?.addEventListener('click', () => removeRow(control))
    }
    return control
  }

  function applyRows(count: number): void {
    while (rows.length > count) {
      const row = rows.pop()
      row?.element.remove()
    }
    while (rows.length < count) {
      if (!appendRow()) break
    }
    applyRowMode()
  }

  function applyPreset(
    total: number,
    ratio: TroopRatio,
    tier: number,
    fc: number,
    t12Level: number,
  ): void {
    applyRows(1)
    const row = rows[0]
    if (!row) return
    for (const level of row.levels.values()) {
      level.tier = clamp(tier, 1, 12)
      level.fc = clamp(fc, 0, 10)
      renderLevel(level)
    }
    for (const control of t12.values()) {
      control.level = clamp(t12Level, 0, 24)
      renderT12(control)
    }
    refreshT12Visibility()
    state.total = total
    state.ratio = ratio
    state.counts = allocateTroopCounts(total, ratio)
    writeSingleRowCounts()
    applyRowMode()
    renderChrome()
  }

  function applyTroops(
    troops: Record<TroopType, SimulatorTroopLoadout>,
  ): void {
    const rowCount = Math.max(
      1,
      ...TROOP_TYPES.map(({ id }) => troops[id]?.groups.length ?? 0),
    )
    applyRows(rowCount)

    for (const { id } of TROOP_TYPES) {
      const loadout = troops[id]
      if (!loadout) continue
      const fallback = loadout.groups[0]
      rows.forEach((row, index) => {
        const level = row.levels.get(id)
        const input = row.counts.get(id)
        const group = loadout.groups[index]
        if (level) {
          level.tier = clamp(
            group?.tier ?? fallback?.tier ?? DEFAULT_TROOP_TIER,
            1,
            12,
          )
          level.fc = clamp(group?.fc ?? fallback?.fc ?? DEFAULT_TROOP_FC, 0, 10)
          renderLevel(level)
        }
        if (input) {
          input.value =
            group && group.count > 0 ? String(Math.round(group.count)) : ''
        }
      })

      const control = t12.get(id)
      if (control) {
        control.level = clamp(loadout.t12, 0, 24)
        renderT12(control)
      }
    }

    refreshT12Visibility()
    syncFromCounts()
  }

  function setRatio(next: TroopRatio): void {
    if (mixed) return
    state.ratio = next
    state.counts =
      state.total === null ? null : allocateTroopCounts(state.total, next)
    writeSingleRowCounts()
    renderChrome()
  }

  function endDrag(): void {
    if (!drag) return
    const active = controls.get(drag.control)
    if (active) active.dataset['active'] = 'false'
    drag = null
  }

  function updateFromDrag(clientX: number): void {
    if (!drag || mixed) return
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

  /* Initialise the first row and its per-class T12 boxes. */
  rows.push(initRow(firstRow, 0))

  for (const card of firstRow.querySelectorAll<HTMLElement>('[data-troop-type]')) {
    const typeId = card.dataset['troopType'] as TroopType | undefined
    const typeLabel = card.dataset['troopTypeLabel'] ?? 'Troop'
    const button = card.querySelector<HTMLButtonElement>('[data-troop-t12-slot]')
    const value = card.querySelector<HTMLElement>('[data-troop-t12-value]')
    if (!typeId || !button || !value) continue

    const control: T12Control = {
      level: clamp(
        parseLabeledInt(value.textContent, DEFAULT_TROOP_T12_SKILL),
        0,
        24,
      ),
      sideLabel,
      typeId,
      typeLabel,
      button,
      value,
    }
    renderT12(control)
    t12.set(typeId, control)

    button.addEventListener('click', () => {
      pickers.t12?.open(
        {
          sideLabel,
          title: `${TROOP_T12_SKILL_NAMES[typeId]} Level: ${control.level}`,
          value: control.level,
          setValue: (level) => {
            control.level = level
            renderT12(control)
          },
        },
        button,
      )
    })
  }

  refreshT12Visibility()

  totalInput.addEventListener('input', () => {
    if (mixed) return
    const caret = totalInput.selectionStart ?? totalInput.value.length
    const edit = sanitizeTroopCountInput(totalInput.value, caret)
    if (edit.value !== totalInput.value) {
      totalInput.value = edit.value
      totalInput.setSelectionRange(edit.caret, edit.caret)
    }
    state.total = parseTroopCount(totalInput.value)
    state.counts =
      state.total === null
        ? null
        : allocateTroopCounts(state.total, state.ratio)
    writeSingleRowCounts()
    renderChrome()
  })

  side.addEventListener('input', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (!target.matches('input[data-troop-count]')) return
    const caret = target.selectionStart ?? target.value.length
    const edit = sanitizeTroopCountInput(target.value, caret)
    if (edit.value !== target.value) {
      target.value = edit.value
      target.setSelectionRange(edit.caret, edit.caret)
    }
    syncFromCounts()
  })

  for (const [control, element] of controls) {
    element.addEventListener('keydown', (event) => {
      if (mixed) return
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
    if (mixed || event.button !== 0) return
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
  addRowButton.addEventListener('click', addRow)

  applyRowMode()
  renderChrome()

  return { applyPreset, applyTroops }
}

export function initTroopPower(): void {
  const section = document.querySelector<HTMLElement>('[data-troop-power]')
  if (!section) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

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

  const pickers: Pickers = {
    tier:
      tierDialog && tierTitle && tierSide && tierOptions && tierClose
        ? createLoadoutPicker({
            dialog: tierDialog,
            titleElement: tierTitle,
            sideElement: tierSide,
            options: tierOptions,
            closeButton: tierClose,
            values: TROOP_TIERS,
            format: (value) => `T${value}`,
            columns: 4,
          })
        : null,
    fc:
      fcDialog && fcTitle && fcSide && fcOptions && fcClose
        ? createLoadoutPicker({
            dialog: fcDialog,
            titleElement: fcTitle,
            sideElement: fcSide,
            options: fcOptions,
            closeButton: fcClose,
            values: TROOP_FC_LEVELS,
            format: (value) => `FC${value}`,
            columns: 4,
          })
        : null,
    t12:
      t12Dialog && t12Title && t12Side && t12Options && t12Close
        ? createLoadoutPicker({
            dialog: t12Dialog,
            titleElement: t12Title,
            sideElement: t12Side,
            options: t12Options,
            closeButton: t12Close,
            values: TROOP_T12_SKILL_LEVELS,
            format: (value) => `Lv ${value}`,
            columns: 5,
          })
        : null,
  }

  const sideControllers = new Map<string, SideController>()
  for (const side of section.querySelectorAll<HTMLElement>('[data-troop-power-side]')) {
    const controller = initSide(side, pickers, reduceMotion)
    const sideId = side.dataset['troopPowerSide']
    if (controller && sideId) sideControllers.set(sideId, controller)
  }

  onGenerationChange((generation) => {
    const preset = getGenerationPreset(generation)
    if (!preset) return

    for (const [side, controller] of sideControllers) {
      const lineup = getGenerationLineup(preset, side === 'right' ? 'right' : 'left')
      controller.applyPreset(
        preset.totalTroops,
        lineup.ratio,
        preset.tier,
        preset.fc,
        preset.t12Skills,
      )
    }
  })

  onSimulatorLoad((detail) => {
    for (const side of ['left', 'right'] as const) {
      sideControllers.get(side)?.applyTroops(detail[side].troops)
    }
  })
}
