import { runCommand } from './api'
import { openDialog, showError } from './dialog'
import { el } from './dom'
import { getSnapshot, subscribe } from './store'
import type { Snapshot } from './types'

let selectedProfile = ''
let loadedProfile: string | null = null
let taskKey = ''
let selectKey = ''
const taskInputs = new Map<string, HTMLInputElement>()

function renderSelect(snapshot: Snapshot): void {
  const select = el<HTMLSelectElement>('profile-select')
  const names = Object.keys(snapshot.profiles)
  const key = names.join('\u0000')
  if (key !== selectKey) {
    selectKey = key
    select.replaceChildren(...names.map((name) => new Option(name, name)))
  }
  if (!names.includes(selectedProfile)) selectedProfile = names[0] ?? ''
  select.value = selectedProfile
}

function renderTasks(snapshot: Snapshot): void {
  const key = snapshot.tasks.map((task) => `${task.id}:${task.priority}`).join('|')
  if (key === taskKey) return

  taskKey = key
  loadedProfile = null
  const list = el<HTMLUListElement>('profile-tasks')
  const template = el<HTMLTemplateElement>('profile-task-template')
  list.replaceChildren()
  taskInputs.clear()

  for (const task of snapshot.tasks) {
    const fragment = template.content.cloneNode(true) as DocumentFragment
    const root = fragment.querySelector<HTMLLIElement>('.app-check-row')
    const checkbox = fragment.querySelector<HTMLInputElement>('.app-check')
    const name = fragment.querySelector<HTMLElement>('.app-task-name')
    const priority = fragment.querySelector<HTMLElement>('.app-task-priority')
    if (!root || !checkbox || !name || !priority) continue
    name.textContent = task.name
    priority.textContent = `Priority ${task.priority}`
    checkbox.setAttribute('aria-label', `Task ${task.name}`)
    taskInputs.set(task.id, checkbox)
    list.append(root)
  }
}

function renderProfiles(snapshot: Snapshot | null): void {
  if (!snapshot) return
  renderSelect(snapshot)
  renderTasks(snapshot)
  if (loadedProfile !== selectedProfile) {
    const selected = new Set(snapshot.profiles[selectedProfile] ?? [])
    for (const [taskId, input] of taskInputs) input.checked = selected.has(taskId)
    loadedProfile = selectedProfile
  }
}

async function saveProfile(): Promise<void> {
  const snapshot = getSnapshot()
  if (!snapshot) return
  let name = selectedProfile
  if (!name) {
    const value = await openDialog({ title: 'Save profile', text: 'Choose a name for the profile.', inputLabel: 'Name', confirmLabel: 'Save' })
    if (typeof value !== 'string') return
    name = value
  }
  const taskIds = snapshot.tasks.map((task) => task.id).filter((taskId) => taskInputs.get(taskId)?.checked)
  const result = await runCommand('save_profile', { name, task_ids: taskIds })
  if (!result.ok) {
    showError(result.error ?? 'Could not save the profile.')
    return
  }
  selectedProfile = name
  loadedProfile = null
}

async function newProfile(): Promise<void> {
  const value = await openDialog({ title: 'New profile', text: 'Profiles start empty; tick the tasks you want and save.', inputLabel: 'Name', confirmLabel: 'Create' })
  if (typeof value !== 'string') return
  const result = await runCommand('save_profile', { name: value, task_ids: [] })
  if (!result.ok) {
    showError(result.error ?? 'Could not create the profile.')
    return
  }
  selectedProfile = value
  loadedProfile = null
}

async function deleteProfile(): Promise<void> {
  if (!selectedProfile) {
    showError('Select a profile to delete.')
    return
  }
  const value = await openDialog({ title: 'Delete profile', text: `Delete "${selectedProfile}"?`, confirmLabel: 'Delete' })
  if (value !== true) return
  const result = await runCommand('delete_profile', { name: selectedProfile })
  if (!result.ok) {
    showError(result.error ?? 'Could not delete the profile.')
    return
  }
  selectedProfile = ''
  loadedProfile = null
}

export function initProfiles(): void {
  el<HTMLSelectElement>('profile-select').addEventListener('change', (event) => {
    selectedProfile = (event.target as HTMLSelectElement).value
    loadedProfile = null
    const snapshot = getSnapshot()
    if (snapshot) renderProfiles(snapshot)
  })
  el('profile-new').addEventListener('click', () => {
    void newProfile()
  })
  el('profile-save').addEventListener('click', () => {
    void saveProfile()
  })
  el('profile-delete').addEventListener('click', () => {
    void deleteProfile()
  })
  subscribe(renderProfiles)
}

export function refreshProfiles(): void {
  const snapshot = getSnapshot()
  if (snapshot) renderProfiles(snapshot)
}
