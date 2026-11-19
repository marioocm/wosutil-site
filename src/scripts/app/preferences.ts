import { request, runCommand } from './api'
import { openDialog, showError } from './dialog'
import { el } from './dom'
import { getSnapshot, subscribe } from './store'
import type { PathField, PreferencesPayload } from './types'

let payload: PreferencesPayload | null = null
let pathsDraft: Record<string, Record<string, string>> = {}
let taskOrder: string[] = []
let killSet = false
let bearCallSet = false
let loaded = false
let loading = false
let baseline = ''

function ensurePathDraft(code: string): void {
  if (!pathsDraft[code]) pathsDraft[code] = {}
}

function setChecked(id: string, value: boolean): void {
  el<HTMLInputElement>(id).checked = value
}

function fillSelect(id: string, values: string[], labels: Record<string, string>, selected: string): void {
  const select = el<HTMLSelectElement>(id)
  select.replaceChildren(...values.map((value) => new Option(labels[value] ?? value, value)))
  select.value = values.includes(selected) ? selected : (values[0] ?? '')
}

function renderPathFields(): void {
  const data = payload
  if (!data) return
  const code = el<HTMLSelectElement>('paths-emulator').value
  const fields = data.labels.pathFields[code] ?? []
  const container = el('paths-fields')
  container.replaceChildren()

  for (const field of fields) {
    const row = document.createElement('div')
    row.className = 'app-field-row'
    const label = document.createElement('label')
    label.className = 'app-field'
    const caption = document.createElement('span')
    caption.textContent = field.label
    const input = document.createElement('input')
    input.className = 'app-input'
    input.type = 'text'
    input.value = pathsDraft[code]?.[field.key] ?? ''
    input.addEventListener('input', () => {
      ensurePathDraft(code)
      pathsDraft[code][field.key] = input.value
    })
    label.append(caption, input)
    const browse = document.createElement('button')
    browse.type = 'button'
    browse.className = 'app-button'
    browse.textContent = 'Browse…'
    browse.addEventListener('click', () => {
      void browsePath(code, field, input, browse)
    })
    row.append(label, browse)
    container.append(row)
  }
}

async function browsePath(code: string, field: PathField, input: HTMLInputElement, button: HTMLButtonElement): Promise<void> {
  button.disabled = true
  const original = button.textContent
  button.textContent = 'Choosing…'
  try {
    const result = await request<{ ok: boolean; path: string | null; error?: string }>('/api/pick-path', 'POST', {
      kind: field.kind,
      title: field.label,
      initial: input.value,
    })
    if (!result.ok) {
      showError(result.error ?? 'Could not open the picker.')
      return
    }
    if (result.path) {
      input.value = result.path
      ensurePathDraft(code)
      pathsDraft[code][field.key] = result.path
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
  } finally {
    button.disabled = false
    button.textContent = original
  }
}

function updateEmulatorAvailability(): void {
  el<HTMLSelectElement>('emulator-active').disabled = getSnapshot()?.tool_running === true
}

function renderActiveEmulator(data: PreferencesPayload): void {
  const select = el<HTMLSelectElement>('emulator-active')
  const key = data.emulators.map((emulator) => `${emulator.code}:${emulator.label}`).join(',')
  if (select.dataset['key'] !== key) {
    select.dataset['key'] = key
    select.replaceChildren(...data.emulators.map((emulator) => new Option(emulator.label, emulator.code)))
  }
  select.value = data.preferences.emulator ?? data.activeEmulator
  updateEmulatorAvailability()
}

function renderPathEmulators(data: PreferencesPayload): void {
  const select = el<HTMLSelectElement>('paths-emulator')
  const key = data.emulators.map((emulator) => emulator.code).join(',')
  if (select.dataset['key'] !== key) {
    select.dataset['key'] = key
    select.replaceChildren(...data.emulators.map((emulator) => new Option(emulator.label, emulator.code)))
  }
  if (!data.emulators.some((emulator) => emulator.code === select.value)) select.value = data.activeEmulator
  renderPathFields()
}

function buildMarchOptions(container: HTMLElement, name: string, selected: number, bounds: [number, number]): void {
  container.replaceChildren()
  for (let march = bounds[0]; march <= bounds[1]; march += 1) {
    const option = document.createElement('label')
    option.className = 'app-march-option'
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = name
    input.value = String(march)
    input.checked = march === selected
    input.setAttribute('aria-label', `March ${march}`)
    const value = document.createElement('span')
    value.textContent = String(march)
    option.append(input, value)
    container.append(option)
  }
}

function renderMarchPicker(containerId: string, name: string, selected: number, bounds: [number, number]): void {
  buildMarchOptions(el(containerId), name, selected, bounds)
}

function renderBearMarches(values: number[], bounds: [number, number], count: number): void {
  const container = el('bear-marches')
  container.replaceChildren()
  for (let index = 0; index < count; index += 1) {
    const field = document.createElement('div')
    field.className = 'app-march-field'
    const caption = document.createElement('span')
    caption.textContent = `March ${index + 1}`
    const picker = document.createElement('div')
    picker.className = 'app-march-picker'
    picker.setAttribute('role', 'radiogroup')
    picker.setAttribute('aria-label', `Bear trap march ${index + 1}`)
    buildMarchOptions(picker, `bear-trap-march-${index + 1}`, values[index] ?? bounds[0], bounds)
    field.append(caption, picker)
    container.append(field)
  }
}

function smallButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'app-button app-button--small'
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

function moveTask(from: number, delta: number): void {
  const to = from + delta
  if (to < 0 || to >= taskOrder.length) return
  const [item] = taskOrder.splice(from, 1)
  if (item === undefined) return
  taskOrder.splice(to, 0, item)
  renderPriorityList()
}

function renderPriorityList(): void {
  const data = payload
  if (!data) return
  const list = el<HTMLOListElement>('priority-list')
  list.replaceChildren()
  const tasks = new Map(data.tasks.map((task) => [task.id, task]))

  taskOrder.forEach((taskId, index) => {
    const task = tasks.get(taskId)
    if (!task) return
    const row = document.createElement('li')
    row.className = 'app-priority-row'
    const name = document.createElement('span')
    name.className = 'app-priority-name'
    name.textContent = task.name
    const up = smallButton('Up', () => {
      moveTask(index, -1)
    })
    up.disabled = index === 0
    const down = smallButton('Down', () => {
      moveTask(index, 1)
    })
    down.disabled = index === taskOrder.length - 1
    row.append(name, up, down)
    list.append(row)
  })
}

function selectedMarch(containerId: string, fallback: number): number {
  const input = document.querySelector<HTMLInputElement>(`#${containerId} input:checked`)
  const value = input ? Number(input.value) : fallback
  return Number.isFinite(value) ? value : fallback
}

function selectedBearMarches(): number[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('#bear-marches .app-march-picker input:checked')).map((input) => Number(input.value) || 0)
}

function collectValues(): Record<string, unknown> {
  const defaults = payload?.preferences
  return {
    emulator: el<HTMLSelectElement>('emulator-active').value,
    emulator_paths: pathsDraft,
    task_order: taskOrder,
    kill_beast_march: selectedMarch('kill-beast-marches', defaults?.kill_beast_march ?? 1),
    kill_beast_march_set: killSet,
    bear_trap_marches: selectedBearMarches(),
    bear_rally_call_march: selectedMarch('bear-call-marches', defaults?.bear_rally_call_march ?? 1),
    bear_rally_call_march_set: bearCallSet,
    gather_resource: el<HTMLSelectElement>('gather').value,
    intel_mode: el<HTMLSelectElement>('intel').value,
    mystery_shop_level: el<HTMLSelectElement>('mystery-shop').value,
    debug_mode: el<HTMLInputElement>('debug-mode').checked,
    remember_schedule: el<HTMLInputElement>('remember-schedule').checked,
    start_minimized: el<HTMLInputElement>('start-minimized').checked,
  }
}

function buildForm(): void {
  const data = payload
  if (!data) return
  const prefs = data.preferences

  pathsDraft = {}
  for (const [code, values] of Object.entries(prefs.emulator_paths)) pathsDraft[code] = { ...values }

  const known = new Set(data.tasks.map((task) => task.id))
  taskOrder = prefs.task_order.filter((taskId) => known.has(taskId))
  for (const task of data.tasks) if (!taskOrder.includes(task.id)) taskOrder.push(task.id)

  killSet = prefs.kill_beast_march_set
  bearCallSet = prefs.bear_rally_call_march_set
  renderMarchPicker('bear-call-marches', 'bear-call-march', prefs.bear_rally_call_march, data.bounds.bearRallyCallMarch)
  renderMarchPicker('kill-beast-marches', 'kill-beast-march', prefs.kill_beast_march, data.bounds.killBeastMarch)
  renderBearMarches(prefs.bear_trap_marches, data.bounds.bearTrapMarch, data.bounds.bearTrapCount)
  fillSelect('gather', data.options.gather, data.labels.gather, prefs.gather_resource)
  fillSelect('intel', data.options.intel, data.labels.intel, prefs.intel_mode)
  fillSelect('mystery-shop', data.options.mysteryShop, data.labels.mysteryShop, prefs.mystery_shop_level)
  setChecked('remember-schedule', prefs.remember_schedule)
  setChecked('start-minimized', prefs.start_minimized)
  setChecked('debug-mode', prefs.debug_mode)
  renderActiveEmulator(data)
  renderPathEmulators(data)
  renderPriorityList()
  baseline = JSON.stringify(collectValues())
}

async function loadPreferences(): Promise<void> {
  try {
    payload = await request<PreferencesPayload>('/api/preferences', 'GET')
    loaded = true
    buildForm()
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
  }
}

async function savePreferences(): Promise<void> {
  if (!payload) return
  const button = el<HTMLButtonElement>('preferences-save')
  button.disabled = true
  button.textContent = 'Saving…'
  try {
    const result = await runCommand('save_preferences', { values: collectValues() })
    if (!result.ok) {
      showError(result.error ?? 'Could not save the preferences.')
      return
    }
    loaded = false
    await loadPreferences()
    button.textContent = 'Saved'
    window.setTimeout(() => {
      if (button.textContent === 'Saved') button.textContent = 'Save preferences'
    }, 2500)
  } finally {
    button.disabled = false
    if (button.textContent !== 'Saved') button.textContent = 'Save preferences'
  }
}

function togglePreferencesSection(button: HTMLButtonElement): void {
  const contentId = button.getAttribute('aria-controls')
  const content = contentId ? document.getElementById(contentId) : null
  if (!content) return
  const expanded = button.getAttribute('aria-expanded') !== 'true'
  const title = button.dataset['sectionTitle'] ?? 'section'
  button.setAttribute('aria-expanded', expanded ? 'true' : 'false')
  content.setAttribute('data-expanded', expanded ? 'true' : 'false')
  content.toggleAttribute('inert', !expanded)
  if (expanded) content.removeAttribute('aria-hidden')
  else content.setAttribute('aria-hidden', 'true')
  button.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${title}`)
  button.title = `${expanded ? 'Collapse' : 'Expand'} ${title}`
}

export function isPreferencesDirty(): boolean {
  return loaded && baseline !== '' && JSON.stringify(collectValues()) !== baseline
}

export async function confirmDiscardPreferences(): Promise<boolean> {
  if (!isPreferencesDirty()) return true
  const value = await openDialog({
    title: 'Unsaved changes',
    text: 'Discard your unsaved preference changes?',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
  })
  if (value !== true) return false
  loaded = false
  await loadPreferences()
  return true
}

export function initPreferences(): void {
  el<HTMLFormElement>('preferences-form').addEventListener('submit', (event) => {
    event.preventDefault()
    void savePreferences()
  })
  el<HTMLSelectElement>('emulator-active').addEventListener('change', () => {
    const active = el<HTMLSelectElement>('emulator-active').value
    const paths = el<HTMLSelectElement>('paths-emulator')
    if (Array.from(paths.options).some((option) => option.value === active)) paths.value = active
    renderPathFields()
  })
  el<HTMLSelectElement>('paths-emulator').addEventListener('change', () => {
    renderPathFields()
  })
  el('kill-beast-marches').addEventListener('change', () => {
    killSet = true
  })
  el('bear-call-marches').addEventListener('change', () => {
    bearCallSet = true
  })
  document.querySelectorAll<HTMLElement>('.app-collapse').forEach((section) => {
    section.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return
      const content = section.querySelector<HTMLElement>('.app-collapse-content')
      if (content?.contains(event.target)) return
      const button = section.querySelector<HTMLButtonElement>('.app-collapse-toggle')
      if (button) togglePreferencesSection(button)
    })
  })
  subscribe(() => updateEmulatorAvailability())
}

export function showPreferences(): void {
  if (loaded || loading) return
  loading = true
  void loadPreferences().finally(() => {
    loading = false
  })
}
