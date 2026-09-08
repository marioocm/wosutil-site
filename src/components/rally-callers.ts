import {
  activatePet,
  createId,
  deactivatePet,
  formatMarchSec,
  formatPetRemaining,
  getEffectiveMarchSec,
  getPetRemainingMs,
  loadCallers,
  marchPartsFromSec,
  marchSecFromParts,
  purgeExpired,
  saveCallers,
  sortCallers,
  validateCallerName,
  validatePetMarch,
} from '../rally-callers'
import type { RallyCaller } from '../rally-callers'

type Editing = { id: string; field: 'name' | 'base' | 'pet' } | null

const inputClass =
  'font-primary rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-md text-ink [color-scheme:light] focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/25'
const numberInputClass = `${inputClass} w-20 text-center tabular-nums`
const primaryButtonClass =
  'font-primary cursor-pointer rounded-sm bg-primary px-3 py-2 text-center text-button-md font-medium text-on-primary transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40'
const secondaryButtonClass =
  'font-primary cursor-pointer rounded-sm border border-hairline-strong bg-canvas px-3 py-2 text-center text-button-md font-medium text-ink transition-colors hover:bg-canvas-soft'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function renderMarchEditor(options: {
  initial: number | null
  callerName: string
  kind: 'base' | 'pet'
  focusKey: string
  onCommit: (mm: string, ss: string) => void
  onCancel: () => void
}): { fragment: DocumentFragment; mm: HTMLInputElement; ss: HTMLInputElement } {
  const fragment = document.createDocumentFragment()
  const parts = marchPartsFromSec(options.initial)
  const mm = document.createElement('input')
  mm.type = 'number'
  mm.min = '0'
  mm.max = '99'
  mm.inputMode = 'numeric'
  mm.value = parts.minutes
  mm.setAttribute('aria-label', `Edit ${options.kind} march minutes for ${options.callerName}`)
  mm.className = `${numberInputClass} w-16 px-2 py-1`
  mm.dataset['editFocus'] = options.focusKey
  const ss = document.createElement('input')
  ss.type = 'number'
  ss.min = '0'
  ss.max = '59'
  ss.inputMode = 'numeric'
  ss.value = parts.seconds
  ss.setAttribute('aria-label', `Edit ${options.kind} march seconds for ${options.callerName}`)
  ss.className = `${numberInputClass} w-16 px-2 py-1`
  let cancelled = false
  const commit = (): void => {
    if (!cancelled) options.onCommit(mm.value, ss.value)
  }
  for (const field of [mm, ss]) {
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
      } else if (event.key === 'Escape') {
        cancelled = true
        options.onCancel()
      }
    })
    field.addEventListener('blur', () => {
      if (!cancelled && document.activeElement !== mm && document.activeElement !== ss) {
        commit()
      }
    })
  }
  const sep = el('span', 'text-ink-mute', ':')
  sep.setAttribute('aria-hidden', 'true')
  fragment.append(mm, sep, ss)
  return { fragment, mm, ss }
}

export function mountRallyCallers(root: HTMLElement): { refresh: (now: number) => void } {
  let callers: RallyCaller[] = loadCallers(localStorage, Date.now())
  let formError: string | null = null
  let rowError: string | null = null
  let editing: Editing = null

  persist()

  const title = el('h2', 'text-heading-md font-medium tracking-tight', 'Rally Callers')
  const hint = el(
    'p',
    'text-caption text-ink-mute',
    'Add each caller with an optional march time. Click a name or time to edit it.',
  )

  const form = document.createElement('form')
  form.className = 'flex flex-col gap-2'
  form.setAttribute('aria-label', 'Add rally caller')

  const formRow = el('div', 'flex flex-col gap-2 sm:flex-row')
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.id = 'rally-name'
  nameInput.placeholder = 'Rally caller name'
  nameInput.autocomplete = 'off'
  nameInput.maxLength = 40
  nameInput.className = `${inputClass} min-w-0 flex-1`
  const nameLabel = document.createElement('label')
  nameLabel.htmlFor = 'rally-name'
  nameLabel.className = 'sr-only'
  nameLabel.textContent = 'Rally caller name'

  const mmInput = document.createElement('input')
  mmInput.type = 'number'
  mmInput.id = 'rally-mm'
  mmInput.placeholder = 'MM'
  mmInput.min = '0'
  mmInput.max = '99'
  mmInput.inputMode = 'numeric'
  mmInput.setAttribute('aria-label', 'March minutes')
  mmInput.className = numberInputClass

  const ssInput = document.createElement('input')
  ssInput.type = 'number'
  ssInput.id = 'rally-ss'
  ssInput.placeholder = 'SS'
  ssInput.min = '0'
  ssInput.max = '59'
  ssInput.inputMode = 'numeric'
  ssInput.setAttribute('aria-label', 'March seconds')
  ssInput.className = numberInputClass

  const addButton = document.createElement('button')
  addButton.type = 'submit'
  addButton.id = 'rally-add'
  addButton.textContent = 'Add'
  addButton.className = primaryButtonClass

  const formErrorEl = el('p', 'invisible text-caption text-accent-tomato')
  formErrorEl.id = 'rally-form-error'
  formErrorEl.setAttribute('role', 'alert')

  formRow.append(nameInput, mmInput, ssInput, addButton)
  form.append(nameLabel, formRow, formErrorEl)

  const list = document.createElement('ul')
  list.id = 'rally-list'
  list.className = 'flex flex-col gap-2'
  list.setAttribute('aria-label', 'Rally caller list')

  const empty = el('p', 'text-caption text-ink-mute', 'No rally callers yet. Add the first above.')
  empty.id = 'rally-empty'
  empty.setAttribute('role', 'status')

  const rowErrorEl = el('p', 'invisible text-caption text-accent-tomato')
  rowErrorEl.id = 'rally-row-error'
  rowErrorEl.setAttribute('role', 'alert')

  root.append(title, hint, form, rowErrorEl, list, empty)

  function persist(): void {
    saveCallers(localStorage, callers)
  }

  function findCaller(id: string): RallyCaller | undefined {
    return callers.find((caller) => caller.id === id)
  }

  function syncFormError(): void {
    if (formError === null) {
      formErrorEl.textContent = ''
      formErrorEl.classList.add('invisible')
    } else {
      formErrorEl.textContent = formError
      formErrorEl.classList.remove('invisible')
    }
    addButton.disabled = nameInput.value.trim() === ''
  }

  function syncRowError(): void {
    if (rowError === null) {
      rowErrorEl.textContent = ''
      rowErrorEl.classList.add('invisible')
    } else {
      rowErrorEl.textContent = rowError
      rowErrorEl.classList.remove('invisible')
    }
  }

  function cancelEditing(): void {
    editing = null
    rowError = null
    renderList()
  }

  function renderList(focusEditing = false): void {
    syncRowError()
    list.textContent = ''
    const sorted = sortCallers(callers)
    empty.style.display = sorted.length === 0 ? '' : 'none'

    for (const caller of sorted) {
      list.append(renderRow(caller))
    }

    if (focusEditing && editing) {
      const target = list.querySelector<HTMLElement>(
        `[data-edit-focus="${editing.id}-${editing.field}"]`,
      )
      target?.focus()
      if (target instanceof HTMLInputElement) target.select()
    }
  }

  function renderRow(caller: RallyCaller): HTMLElement {
    const item = document.createElement('li')
    item.className = 'flex flex-col gap-2 rounded-md border border-hairline bg-canvas px-3 py-2'
    item.dataset['callerId'] = caller.id

    const topRow = el('div', 'flex items-center gap-2')

    if (editing?.id === caller.id && editing.field === 'name') {
      const input = document.createElement('input')
      input.type = 'text'
      input.value = caller.name
      input.maxLength = 40
      input.className = `${inputClass} min-w-0 flex-1 py-1`
      input.setAttribute('aria-label', `Edit name for ${caller.name}`)
      input.dataset['editFocus'] = `${caller.id}-name`
      let cancelled = false
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commitNameEdit(caller.id, input.value)
        } else if (event.key === 'Escape') {
          cancelled = true
          cancelEditing()
        }
      })
      input.addEventListener('blur', () => {
        if (!cancelled && editing?.id === caller.id) commitNameEdit(caller.id, input.value)
      })
      topRow.append(input)
    } else {
      const nameButton = document.createElement('button')
      nameButton.type = 'button'
      nameButton.className =
        'min-w-0 flex-1 cursor-pointer truncate text-left text-body-md font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary-deep'
      nameButton.textContent = caller.name
      nameButton.title = 'Click to edit name'
      nameButton.setAttribute('aria-label', `Edit name for ${caller.name}`)
      nameButton.addEventListener('click', () => {
        editing = { id: caller.id, field: 'name' }
        rowError = null
        renderList(true)
      })
      topRow.append(nameButton)
    }

    const visibleKind = caller.petActive ? 'pet' : 'base'
    const isEditingMarch =
      editing?.id === caller.id && (editing.field === 'base' || editing.field === 'pet')

    if (isEditingMarch) {
      const kind = editing?.field === 'pet' ? 'pet' : 'base'
      const initial = kind === 'pet' ? caller.petMarchSec : caller.baseMarchSec
      const editor = renderMarchEditor({
        initial,
        callerName: caller.name,
        kind,
        focusKey: `${caller.id}-${kind}`,
        onCommit: (mm, ss) => {
          if (kind === 'pet') commitPetEdit(caller.id, mm, ss)
          else commitBaseEdit(caller.id, mm, ss)
        },
        onCancel: cancelEditing,
      })
      topRow.append(editor.fragment)
    } else {
      const marchButton = document.createElement('button')
      marchButton.type = 'button'
      marchButton.className =
        'cursor-pointer rounded-sm px-2 py-1 text-body-md tabular-nums text-ink hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-primary-deep'
      marchButton.textContent = formatMarchSec(getEffectiveMarchSec(caller))
      marchButton.title =
        caller.petActive && caller.petMarchSec === null
          ? 'Click to add pet march time'
          : `Click to edit ${visibleKind} march time`
      marchButton.setAttribute(
        'aria-label',
        `Edit ${visibleKind} march time for ${caller.name}`,
      )
      marchButton.addEventListener('click', () => {
        editing = { id: caller.id, field: caller.petActive ? 'pet' : 'base' }
        rowError = null
        renderList(true)
      })
      topRow.append(marchButton)
    }

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = `${secondaryButtonClass} px-2 py-1 text-caption`
    removeButton.textContent = 'Remove'
    removeButton.setAttribute('aria-label', `Remove ${caller.name}`)
    removeButton.addEventListener('click', () => {
      callers = callers.filter((entry) => entry.id !== caller.id)
      if (editing?.id === caller.id) editing = null
      rowError = null
      persist()
      renderList()
    })
    topRow.append(removeButton)
    item.append(topRow)

    const petRow = el('div', 'flex flex-wrap items-center gap-2')
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.setAttribute('role', 'switch')
    toggle.setAttribute('aria-checked', caller.petActive ? 'true' : 'false')
    toggle.setAttribute('aria-label', `Pet skill for ${caller.name}`)
    toggle.className = caller.petActive ? primaryButtonClass : secondaryButtonClass
    toggle.classList.add('px-2', 'py-1', 'text-caption')
    toggle.textContent = caller.petActive ? 'Pets ON' : 'Pets OFF'
    toggle.addEventListener('click', () => {
      togglePet(caller.id)
    })
    petRow.append(toggle)

    if (caller.petActive) {
      const remaining = el(
        'span',
        'text-micro tabular-nums text-ink-mute',
        formatPetRemaining(getPetRemainingMs(caller, Date.now())),
      )
      remaining.title = 'Pet skill remaining'
      remaining.setAttribute('role', 'timer')
      remaining.dataset['petRemaining'] = caller.id
      petRow.append(remaining)
      if (caller.petMarchSec === null && editing?.id !== caller.id) {
        petRow.append(el('span', 'text-caption text-ink-mute', 'Add pet march above'))
      }
    }
    item.append(petRow)

    return item
  }

  function commitNameEdit(id: string, raw: string): void {
    if (editing?.id !== id) return
    const error = validateCallerName(callers, raw, id)
    if (error !== null) {
      rowError = error
      renderList(true)
      return
    }
    callers = callers.map((caller) =>
      caller.id === id ? { ...caller, name: raw.trim() } : caller,
    )
    editing = null
    rowError = null
    persist()
    renderList()
  }

  function commitBaseEdit(id: string, mmRaw: string, ssRaw: string): void {
    if (editing?.id !== id) return
    const caller = findCaller(id)
    const next = marchSecFromParts(mmRaw, ssRaw)
    if (caller?.petActive) {
      const petError = validatePetMarch(next, caller.petMarchSec)
      if (petError !== null) {
        rowError = petError
        renderList(true)
        return
      }
    }
    callers = callers.map((entry) =>
      entry.id === id ? { ...entry, baseMarchSec: next } : entry,
    )
    editing = null
    rowError = null
    persist()
    renderList()
  }

  function commitPetEdit(id: string, mmRaw: string, ssRaw: string): void {
    if (editing?.id !== id) return
    const caller = findCaller(id)
    if (!caller) return
    const next = marchSecFromParts(mmRaw, ssRaw)
    const error = validatePetMarch(caller.baseMarchSec, next)
    if (error !== null) {
      rowError = error
      renderList(true)
      return
    }
    callers = callers.map((entry) =>
      entry.id === id ? { ...entry, petMarchSec: next } : entry,
    )
    editing = null
    rowError = null
    persist()
    renderList()
  }

  function togglePet(id: string): void {
    const caller = findCaller(id)
    if (!caller) return
    if (caller.petActive) {
      callers = callers.map((entry) => (entry.id === id ? deactivatePet(entry) : entry))
      if (editing?.id === id) editing = null
      rowError = null
      persist()
      renderList()
      return
    }
    const now = Date.now()
    callers = callers.map((entry) => (entry.id === id ? activatePet(entry, now) : entry))
    rowError = null
    // Fresh activation without a pet march opens the pet editor immediately.
    editing = caller.petMarchSec === null ? { id, field: 'pet' } : null
    persist()
    renderList(editing !== null)
  }

  function syncPetTimers(now: number): void {
    for (const caller of callers) {
      if (!caller.petActive) continue
      const node = list.querySelector(`[data-pet-remaining="${caller.id}"]`)
      if (node) node.textContent = formatPetRemaining(getPetRemainingMs(caller, now))
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const error = validateCallerName(callers, nameInput.value)
    if (error !== null) {
      formError = error
      syncFormError()
      nameInput.focus()
      return
    }
    callers = [
      ...callers,
      {
        id: createId(),
        name: nameInput.value.trim(),
        baseMarchSec: marchSecFromParts(mmInput.value, ssInput.value),
        petActive: false,
        petMarchSec: null,
        petExpiresAt: null,
      },
    ]
    nameInput.value = ''
    mmInput.value = ''
    ssInput.value = ''
    formError = null
    persist()
    syncFormError()
    renderList()
    nameInput.focus()
  })

  nameInput.addEventListener('input', () => {
    if (formError !== null) {
      formError = null
    }
    syncFormError()
  })

  syncFormError()
  renderList()

  return {
    refresh(now: number): void {
      const purged = purgeExpired(callers, now)
      const changed = purged.some(
        (caller, index) =>
          caller.petActive !== callers[index]?.petActive ||
          caller.petExpiresAt !== callers[index]?.petExpiresAt,
      )
      if (changed) {
        callers = purged
        persist()
        // Don't steal focus from an in-progress edit on background expiry.
        const keepFocus = editing !== null
        renderList(keepFocus)
        return
      }
      syncPetTimers(now)
    },
  }
}
