import { runCommand } from './api'
import { showError } from './dialog'
import { el } from './dom'
import { getSnapshot, subscribe } from './store'
import type { Snapshot } from './types'

type RowRefs = {
  index: number
  checkbox: HTMLInputElement
  profile: HTMLSelectElement
  status: HTMLElement
  tooltip: string
}

const rowNodes = new Map<number, RowRefs>()
let rowKey = ''
let emulatorKey = ''

async function command(name: string, args: Record<string, unknown> = {}): Promise<void> {
  const result = await runCommand(name, args)
  if (!result.ok) showError(result.error ?? 'The command failed.')
  const snapshot = getSnapshot()
  if (snapshot) render(snapshot)
}

async function updateSelection(index: number): Promise<void> {
  const row = rowNodes.get(index)
  if (!row) return
  const result = await runCommand('update_selection', {
    index,
    checked: row.checkbox.checked,
    profile: row.profile.value,
  })
  if (!result.ok) showError(result.error ?? 'Could not update the instance.')
}

function renderEmulator(snapshot: Snapshot): void {
  const select = el<HTMLSelectElement>('emulator')
  const key = snapshot.emulator_options.map((option) => option.code).join(',')
  if (key !== emulatorKey) {
    select.replaceChildren(...snapshot.emulator_options.map((option) => new Option(option.label, option.code)))
    emulatorKey = key
  }
  select.value = snapshot.emulator
  select.disabled = snapshot.tool_running
}

function renderToolbar(snapshot: Snapshot): void {
  el('tool-status').textContent = snapshot.tool_running ? 'Tool running' : 'Tool stopped'
  el('start').hidden = snapshot.tool_running
  el('stop').hidden = !snapshot.tool_running
  el('refresh').hidden = snapshot.tool_running
  el('limit-field').hidden = snapshot.tool_running
  const limit = el<HTMLInputElement>('limit')
  if (document.activeElement !== limit) limit.value = String(snapshot.max_instances)
}

function buildRows(snapshot: Snapshot): void {
  const list = el<HTMLUListElement>('instances')
  const template = el<HTMLTemplateElement>('instance-template')
  const profileNames = Object.keys(snapshot.profiles)

  list.replaceChildren()
  rowNodes.clear()

  for (const instance of snapshot.instances) {
    const fragment = template.content.cloneNode(true) as DocumentFragment
    const root = fragment.querySelector<HTMLLIElement>('.app-row')
    const checkbox = fragment.querySelector<HTMLInputElement>('.app-check')
    const name = fragment.querySelector<HTMLElement>('.app-row-name')
    const profile = fragment.querySelector<HTMLSelectElement>('.app-row-profile')
    const status = fragment.querySelector<HTMLElement>('.app-row-status')
    if (!root || !checkbox || !name || !profile || !status) continue

    name.textContent = `Instance ${instance.index} (${instance.name})`
    checkbox.checked = instance.checked
    checkbox.disabled = snapshot.tool_running
    checkbox.setAttribute('aria-label', `Select instance ${instance.index}`)
    checkbox.addEventListener('change', () => {
      void updateSelection(instance.index)
    })

    profile.replaceChildren(...profileNames.map((profileName) => new Option(profileName, profileName)))
    profile.value = instance.profile
    profile.disabled = snapshot.tool_running
    profile.setAttribute('aria-label', `Profile for instance ${instance.index}`)
    profile.addEventListener('change', () => {
      void updateSelection(instance.index)
    })

    status.textContent = instance.status
    status.title = instance.tooltip

    list.append(root)
    rowNodes.set(instance.index, { index: instance.index, checkbox, profile, status, tooltip: instance.tooltip })
  }

  list.hidden = snapshot.instances.length === 0
  el('empty').hidden = snapshot.instances.length > 0
}

function renderRows(snapshot: Snapshot): void {
  const key = `${snapshot.tool_running}|${snapshot.instances.map((instance) => `${instance.index}:${instance.name}`).join(',')}|${Object.keys(snapshot.profiles).join(',')}`
  if (key !== rowKey) {
    buildRows(snapshot)
    rowKey = key
    return
  }

  for (const instance of snapshot.instances) {
    const row = rowNodes.get(instance.index)
    if (!row) continue
    row.status.textContent = instance.status
    row.status.title = instance.tooltip
    row.tooltip = instance.tooltip
  }
}

function render(snapshot: Snapshot): void {
  renderEmulator(snapshot)
  renderToolbar(snapshot)
  renderRows(snapshot)
}

export function initInstances(): void {
  el('start').addEventListener('click', () => {
    void command('start_tool')
  })
  el('stop').addEventListener('click', () => {
    void command('stop_tool')
  })
  el('refresh').addEventListener('click', () => {
    void command('refresh_instances')
  })
  el<HTMLInputElement>('limit').addEventListener('change', (event) => {
    const value = Number((event.target as HTMLInputElement).value)
    if (Number.isFinite(value)) void command('set_max_instances', { value })
  })
  el<HTMLSelectElement>('emulator').addEventListener('change', (event) => {
    void command('set_emulator', { emulator: (event.target as HTMLSelectElement).value })
  })
  subscribe(render)
}
