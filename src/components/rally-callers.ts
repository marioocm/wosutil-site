import {
  activatePet,
  createId,
  deactivatePet,
  formatMarchSec,
  formatPetRemaining,
  getEffectiveMarchSec,
  getPetRemainingMs,
  loadCallers,
  marchSecFromParts,
  purgeExpired,
  saveCallers,
  sortCallers,
  validateCallerName,
  validatePetMarch,
} from '../rally-callers'
import type { RallyCaller } from '../rally-callers'
import {
  isSelectable,
  loadSelection,
  sanitizeSelection,
  saveSelection,
  toggleSelection,
} from '../rally-selection'
import { buildDurationGroup, wireMarchEditor } from './duration-input'

type Editing = { id: string; field: 'name' | 'base' | 'pet' } | null

const inputClass =
  'font-primary rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-md text-ink [color-scheme:light] focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/25'
// Same box as the small duration inputs (px-2 py-1 + border): swapping the
// name button for this input never changes the row height.
const rowTextInputClass =
  'font-primary min-w-0 flex-1 rounded-sm border border-hairline bg-canvas px-2 py-1 text-body-md text-ink [color-scheme:light] focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/25'
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

function ignorePasswordManagers(target: HTMLElement): void {
  // 1Password / LastPass / Bitwarden otherwise offer to save these plain
  // text fields as logins or identities.
  target.setAttribute('data-1p-ignore', 'true')
  target.setAttribute('data-lpignore', 'true')
  target.setAttribute('data-bwignore', 'true')
}

export function mountRallyCallers(root: HTMLElement): {
  refresh: (now: number) => void
  getCallers: () => RallyCaller[]
  getSelection: () => Set<string>
  onSelectionChange: (listener: () => void) => void
} {
  let callers: RallyCaller[] = loadCallers(localStorage, Date.now())
  let selection: Set<string> = sanitizeSelection(loadSelection(localStorage), callers)
  let formError: string | null = null
  let rowError: string | null = null
  let editing: Editing = null
  const selectionListeners = new Set<() => void>()

  persist()

  const form = document.createElement('form')
  form.className = 'flex flex-col gap-2'
  form.setAttribute('aria-label', 'Add rally caller')
  form.autocomplete = 'off'
  ignorePasswordManagers(form)

  const formRow = el('div', 'flex flex-col gap-2 sm:flex-row sm:items-center')
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.id = 'rally-caller'
  nameInput.name = 'rally-caller'
  nameInput.placeholder = 'Rally caller'
  nameInput.autocomplete = 'off'
  nameInput.maxLength = 40
  nameInput.className = `${inputClass} min-w-0 flex-1`
  ignorePasswordManagers(nameInput)
  const nameLabel = document.createElement('label')
  nameLabel.htmlFor = 'rally-caller'
  nameLabel.className = 'sr-only'
  nameLabel.textContent = 'Rally caller'

  const formDuration = buildDurationGroup({
    initial: null,
    minutesLabel: 'March minutes',
    secondsLabel: 'March seconds',
    minutesName: 'rally-mm',
    secondsName: 'rally-ss',
  })
  formDuration.mm.id = 'rally-mm'
  formDuration.ss.id = 'rally-ss'

  const addButton = document.createElement('button')
  addButton.type = 'submit'
  addButton.id = 'rally-add'
  addButton.textContent = 'Add'
  addButton.className = `${primaryButtonClass} shrink-0`

  const formErrorEl = el('p', 'invisible text-caption text-accent-tomato')
  formErrorEl.id = 'rally-form-error'
  formErrorEl.setAttribute('role', 'alert')

  formRow.append(nameInput, formDuration.group, addButton)
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

  root.append(form, rowErrorEl, list, empty)

  function persist(): void {
    saveCallers(localStorage, callers)
  }

  function persistSelection(): void {
    saveSelection(localStorage, selection)
  }

  function notifySelection(): void {
    for (const listener of selectionListeners) listener()
  }

  function pruneSelection(): void {
    const pruned = sanitizeSelection(selection, callers)
    // Drop callers that lost their march time (not selectable anymore).
    for (const id of [...pruned]) {
      const caller = callers.find((entry) => entry.id === id)
      if (caller && !isSelectable(caller)) pruned.delete(id)
    }
    if (pruned.size !== selection.size) {
      selection = pruned
      persistSelection()
    }
  }

  function toggleSelect(id: string): void {
    const caller = findCaller(id)
    if (!caller || !isSelectable(caller)) return
    // Never steal an in-progress edit: row clicks while editing do nothing.
    if (editing?.id === id) return
    const refocus = document.activeElement?.id === `rally-select-${id}`
    selection = toggleSelection(selection, id)
    persistSelection()
    notifySelection()
    renderList()
    if (refocus) document.getElementById(`rally-select-${id}`)?.focus()
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
    const selectable = isSelectable(caller)
    const selected = selectable && selection.has(caller.id)
    item.className = selected
      ? 'flex items-center gap-2 rounded-md border border-primary-deep bg-primary/10 px-3 py-2 shadow-sm transition-all -translate-y-px cursor-pointer'
      : 'flex items-center gap-2 rounded-md border border-hairline bg-canvas px-3 py-2 transition-all hover:border-hairline-strong cursor-pointer'
    item.dataset['callerId'] = caller.id
    if (selected) item.dataset['selected'] = 'true'
    item.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button,input,a,select,textarea,label')) return
      toggleSelect(caller.id)
    })

    const selectButton = document.createElement('button')
    selectButton.type = 'button'
    selectButton.id = `rally-select-${caller.id}`
    selectButton.className = selected
      ? 'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary-deep bg-primary text-on-primary focus-visible:outline-2 focus-visible:outline-primary-deep'
      : 'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline-strong bg-canvas text-transparent transition-colors hover:border-primary-deep focus-visible:outline-2 focus-visible:outline-primary-deep'
    selectButton.setAttribute('aria-pressed', selected ? 'true' : 'false')
    selectButton.setAttribute('aria-label', `Select ${caller.name}`)
    if (!selectable) {
      selectButton.disabled = true
      selectButton.setAttribute('aria-disabled', 'true')
      selectButton.title = 'Add a march time to select'
      selectButton.classList.add('cursor-not-allowed', 'opacity-40')
    } else {
      selectButton.title = selected ? 'Deselect' : 'Select'
    }
    selectButton.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5 4.5-5.5"/></svg>'
    selectButton.addEventListener('click', (event) => {
      event.stopPropagation()
      toggleSelect(caller.id)
    })
    item.append(selectButton)

    if (editing?.id === caller.id && editing.field === 'name') {
      const input = document.createElement('input')
      input.type = 'text'
      input.value = caller.name
      input.maxLength = 40
      input.name = 'rally-edit-caller'
      input.autocomplete = 'off'
      input.className = rowTextInputClass
      input.setAttribute('aria-label', `Edit caller ${caller.name}`)
      input.dataset['editFocus'] = `${caller.id}-name`
      ignorePasswordManagers(input)
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
      item.append(input)
    } else {
      const nameButton = document.createElement('button')
      nameButton.type = 'button'
      nameButton.className =
        'min-w-0 w-auto max-w-[10rem] shrink cursor-pointer truncate text-left text-body-md font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary-deep'
      nameButton.textContent = caller.name
      nameButton.title = 'Click to edit'
      nameButton.setAttribute('aria-label', `Edit caller ${caller.name}`)
      nameButton.addEventListener('click', () => {
        editing = { id: caller.id, field: 'name' }
        rowError = null
        renderList(true)
      })
      item.append(nameButton)
      // Flexible gap: clicking here toggles selection (handled by the li).
      const spacer = document.createElement('span')
      spacer.className = 'min-h-6 min-w-4 flex-1'
      spacer.setAttribute('aria-hidden', 'true')
      item.append(spacer)
    }

    // Pets ON without a pet march keeps an open (empty) editor in place —
    // the base time is never shown as fallback.
    const isEditingThis = editing?.id === caller.id ? editing.field : null
    const wantsPetEditor =
      caller.petActive && (caller.petMarchSec === null || isEditingThis === 'pet')

    if (wantsPetEditor) {
      const editor = buildDurationGroup({
        initial: caller.petMarchSec,
        minutesLabel: `Edit pet march minutes for ${caller.name}`,
        secondsLabel: `Edit pet march seconds for ${caller.name}`,
        minutesName: 'rally-pet-mm',
        secondsName: 'rally-pet-ss',
        focusKey: `${caller.id}-pet`,
        small: true,
      })
      wireMarchEditor({
        mm: editor.mm,
        ss: editor.ss,
        dismissable: false,
        onCommit: (mm, ss) => commitPetEdit(caller.id, mm, ss),
        onCancel: cancelEditing,
      })
      item.append(editor.group)
    } else if (isEditingThis === 'base') {
      const editor = buildDurationGroup({
        initial: caller.baseMarchSec,
        minutesLabel: `Edit march minutes for ${caller.name}`,
        secondsLabel: `Edit march seconds for ${caller.name}`,
        minutesName: 'rally-base-mm',
        secondsName: 'rally-base-ss',
        focusKey: `${caller.id}-base`,
        small: true,
      })
      wireMarchEditor({
        mm: editor.mm,
        ss: editor.ss,
        dismissable: true,
        onCommit: (mm, ss) => commitBaseEdit(caller.id, mm, ss),
        onCancel: cancelEditing,
      })
      item.append(editor.group)
    } else {
      const marchButton = document.createElement('button')
      marchButton.type = 'button'
      marchButton.className =
        'shrink-0 cursor-pointer rounded-sm border border-transparent px-2 py-1 text-body-md tabular-nums text-ink hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-primary-deep'
      marchButton.textContent = formatMarchSec(getEffectiveMarchSec(caller))
      marchButton.title = 'Click to edit'
      marchButton.setAttribute(
        'aria-label',
        `Edit ${caller.petActive ? 'pet' : 'base'} march time for ${caller.name}`,
      )
      marchButton.addEventListener('click', () => {
        editing = { id: caller.id, field: caller.petActive ? 'pet' : 'base' }
        rowError = null
        renderList(true)
      })
      item.append(marchButton)
    }

    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.setAttribute('role', 'switch')
    toggle.setAttribute('aria-checked', caller.petActive ? 'true' : 'false')
    toggle.setAttribute('aria-label', `Pet skill for ${caller.name}`)
    toggle.className = caller.petActive ? primaryButtonClass : secondaryButtonClass
    toggle.classList.add('shrink-0', 'px-2', 'py-1', 'text-caption')
    toggle.textContent = caller.petActive ? 'Pets ON' : 'Pets OFF'
    toggle.addEventListener('click', () => {
      togglePet(caller.id)
    })
    item.append(toggle)

    if (caller.petActive) {
      const remaining = el(
        'span',
        'shrink-0 text-micro tabular-nums text-ink-mute',
        formatPetRemaining(getPetRemainingMs(caller, Date.now())),
      )
      remaining.title = 'Pet skill remaining'
      remaining.setAttribute('role', 'timer')
      remaining.dataset['petRemaining'] = caller.id
      item.append(remaining)
    }

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className =
      'shrink-0 cursor-pointer rounded-sm border border-hairline-strong bg-canvas p-1.5 text-accent-tomato transition-colors hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-primary-deep'
    removeButton.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>'
    removeButton.title = 'Remove'
    removeButton.setAttribute('aria-label', `Remove ${caller.name}`)
    removeButton.addEventListener('click', () => {
      callers = callers.filter((entry) => entry.id !== caller.id)
      if (selection.has(caller.id)) {
        selection = toggleSelection(selection, caller.id)
        persistSelection()
      }
      if (editing?.id === caller.id) editing = null
      rowError = null
      persist()
      notifySelection()
      renderList()
    })
    item.append(removeButton)

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
    notifySelection()
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
    pruneSelection()
    notifySelection()
    renderList()
  }

  function commitPetEdit(id: string, mmRaw: string, ssRaw: string): void {
    if (editing?.id !== id) return
    const caller = findCaller(id)
    if (!caller) return
    const next = marchSecFromParts(mmRaw, ssRaw)
    if (next === null) {
      // Empty pet march stays open (never falls back to displaying base).
      renderList(true)
      return
    }
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
    pruneSelection()
    notifySelection()
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
      pruneSelection()
      notifySelection()
      renderList()
      return
    }
    const now = Date.now()
    callers = callers.map((entry) => (entry.id === id ? activatePet(entry, now) : entry))
    rowError = null
    // Fresh activation without a pet march opens the pet editor immediately.
    editing = caller.petMarchSec === null ? { id, field: 'pet' } : null
    persist()
    pruneSelection()
    notifySelection()
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
        baseMarchSec: marchSecFromParts(formDuration.mm.value, formDuration.ss.value),
        petActive: false,
        petMarchSec: null,
        petExpiresAt: null,
      },
    ]
    nameInput.value = ''
    formDuration.mm.value = ''
    formDuration.ss.value = ''
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
    getCallers(): RallyCaller[] {
      return [...callers]
    },
    getSelection(): Set<string> {
      return new Set(selection)
    },
    onSelectionChange(listener: () => void): void {
      selectionListeners.add(listener)
    },
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
        pruneSelection()
        notifySelection()
        // Don't steal focus from an in-progress edit on background expiry.
        const keepFocus = editing !== null
        renderList(keepFocus)
        return
      }
      syncPetTimers(now)
    },
  }
}
