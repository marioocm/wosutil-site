import { runCommand } from './api'
import { showError } from './dialog'
import { el } from './dom'
import { getSnapshot, subscribe } from './store'
import type { InstanceRow, Snapshot } from './types'

type RowRefs = {
  slot: HTMLLIElement
  checkbox: HTMLInputElement
  profile: HTMLSelectElement
  profileName: HTMLElement
  status: HTMLElement
  info: HTMLButtonElement
  tooltip: string
  visible: boolean
  hideTimer: number
}

type TaskEntry = {
  position: string
  name: string
  time: string
}

const ROW_ANIMATION_MS = 220
const TOOLBAR_ANIMATION_MS = 180
const rowNodes = new Map<number, RowRefs>()
let rowKey = ''
let lastToolRunning: boolean | null = null
let tooltipIndex: number | null = null
let tooltipPinned = false
let tooltipTimer = 0

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

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function parseTasks(text: string): TaskEntry[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(\d+)\.\s+(.*)$/.exec(line)
      const body = match?.[2] ?? line
      const separator = body.lastIndexOf(': ')
      return {
        position: match?.[1] ?? '',
        name: separator === -1 ? body : body.slice(0, separator),
        time: separator === -1 ? '' : body.slice(separator + 2),
      }
    })
}

function renderTasktip(text: string): void {
  const list = el<HTMLOListElement>('task-tooltip-list')
  const tasks = parseTasks(text)
  list.replaceChildren()

  if (tasks.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'app-tasktip-empty'
    empty.textContent = 'No programmed tasks'
    list.append(empty)
    return
  }

  for (const task of tasks) {
    const row = document.createElement('li')
    row.className = 'app-tasktip-row'
    const position = document.createElement('span')
    position.className = 'app-tasktip-position'
    position.textContent = task.position ? `${task.position}.` : ''
    const name = document.createElement('span')
    name.className = 'app-tasktip-name'
    name.textContent = task.name
    const time = document.createElement('span')
    time.className = 'app-tasktip-time'
    time.textContent = task.time
    row.append(position, name, time)
    list.append(row)
  }
}

function positionTasktip(): void {
  const panel = el('task-tooltip')
  if (panel.hidden || tooltipIndex === null) return
  const row = rowNodes.get(tooltipIndex)
  if (!row) {
    hideTasktip()
    return
  }

  const margin = 8
  const gap = 6
  const anchor = row.info.getBoundingClientRect()
  const width = panel.offsetWidth
  const height = panel.offsetHeight
  const left = Math.max(margin, Math.min(anchor.right - width, window.innerWidth - width - margin))
  let top = anchor.bottom + gap
  if (top + height > window.innerHeight - margin) top = Math.max(margin, anchor.top - height - gap)
  panel.style.left = `${Math.round(left)}px`
  panel.style.top = `${Math.round(top)}px`
}

function showTasktip(index: number, pinned = false): void {
  window.clearTimeout(tooltipTimer)
  const row = rowNodes.get(index)
  if (!row || !row.tooltip) return
  tooltipIndex = index
  tooltipPinned = pinned
  renderTasktip(row.tooltip)
  const panel = el('task-tooltip')
  panel.hidden = false
  panel.scrollTop = 0
  positionTasktip()
}

function hideTasktip(): void {
  window.clearTimeout(tooltipTimer)
  tooltipIndex = null
  tooltipPinned = false
  el('task-tooltip').hidden = true
}

function scheduleTasktip(index: number): void {
  window.clearTimeout(tooltipTimer)
  tooltipTimer = window.setTimeout(() => {
    showTasktip(index)
  }, 120)
}

function scheduleHideTasktip(): void {
  if (tooltipPinned) return
  window.clearTimeout(tooltipTimer)
  tooltipTimer = window.setTimeout(hideTasktip, 180)
}

function refreshTasktip(): void {
  if (tooltipIndex === null) return
  const row = rowNodes.get(tooltipIndex)
  if (!row || !row.tooltip || row.info.hidden) {
    hideTasktip()
    return
  }
  const panel = el('task-tooltip')
  const scrollTop = panel.scrollTop
  renderTasktip(row.tooltip)
  panel.scrollTop = scrollTop
  positionTasktip()
}

function animateToolbar(): void {
  if (prefersReducedMotion()) return
  const actions = document.querySelector<HTMLElement>('#view-instances .app-actions')
  actions?.animate(
    [
      { opacity: 0, transform: 'translateY(-2px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: TOOLBAR_ANIMATION_MS, easing: 'ease' },
  )
}

function renderToolbar(snapshot: Snapshot): void {
  const changed = lastToolRunning !== null && lastToolRunning !== snapshot.tool_running
  lastToolRunning = snapshot.tool_running
  el('start').hidden = snapshot.tool_running
  el('stop').hidden = !snapshot.tool_running
  el('refresh').hidden = snapshot.tool_running
  el('limit-field').hidden = snapshot.tool_running
  const limit = el<HTMLInputElement>('limit')
  if (document.activeElement !== limit) limit.value = String(snapshot.max_instances)
  if (changed) animateToolbar()
}

function updateRow(row: RowRefs, instance: InstanceRow, running: boolean): void {
  if (row.checkbox.checked !== instance.checked) row.checkbox.checked = instance.checked
  if (row.profile.value !== instance.profile) row.profile.value = instance.profile
  row.profileName.textContent = instance.profile

  row.checkbox.hidden = running
  row.checkbox.disabled = running
  row.profile.hidden = running
  row.profile.disabled = running
  row.profileName.hidden = !running

  row.status.textContent = instance.status
  row.tooltip = instance.tooltip
  row.info.hidden = !instance.tooltip
}

function setRowVisible(row: RowRefs, visible: boolean, animate: boolean): void {
  const collapsed = row.slot.hasAttribute('data-collapsed')
  if (visible ? row.visible && !row.slot.hidden && !collapsed : !row.visible && (row.slot.hidden || collapsed)) return
  row.visible = visible
  window.clearTimeout(row.hideTimer)
  row.slot.toggleAttribute('inert', !visible)

  if (!animate) {
    row.slot.hidden = !visible
    row.slot.toggleAttribute('data-collapsed', !visible)
    return
  }

  if (visible) {
    row.slot.hidden = false
    row.slot.setAttribute('data-collapsed', 'true')
    void row.slot.offsetHeight
    row.slot.removeAttribute('data-collapsed')
    return
  }

  row.slot.removeAttribute('hidden')
  void row.slot.offsetHeight
  row.slot.setAttribute('data-collapsed', 'true')
  row.hideTimer = window.setTimeout(() => {
    if (!row.visible) row.slot.hidden = true
  }, ROW_ANIMATION_MS)
}

function updateLastVisible(): void {
  let last: HTMLLIElement | null = null
  for (const row of rowNodes.values()) {
    if (row.visible) last = row.slot
  }
  for (const row of rowNodes.values()) {
    row.slot.toggleAttribute('data-last-visible', row.slot === last)
  }
}

function updateEmpty(snapshot: Snapshot): void {
  const visibleCount = snapshot.tool_running ? snapshot.instances.filter((instance) => instance.checked).length : snapshot.instances.length
  const empty = el('empty')
  empty.textContent = snapshot.tool_running ? 'No instances selected.' : 'No emulator instances detected.'
  empty.hidden = visibleCount > 0
  el('instances').hidden = snapshot.instances.length === 0
}

function buildRows(snapshot: Snapshot): void {
  const list = el<HTMLUListElement>('instances')
  const template = el<HTMLTemplateElement>('instance-template')
  const profileNames = Object.keys(snapshot.profiles)

  list.replaceChildren()
  rowNodes.clear()
  hideTasktip()

  for (const instance of snapshot.instances) {
    const fragment = template.content.cloneNode(true) as DocumentFragment
    const slot = fragment.querySelector<HTMLLIElement>('.app-row-slot')
    const checkbox = fragment.querySelector<HTMLInputElement>('.app-check')
    const name = fragment.querySelector<HTMLElement>('.app-row-name')
    const profile = fragment.querySelector<HTMLSelectElement>('.app-row-profile')
    const profileName = fragment.querySelector<HTMLElement>('.app-row-profile-name')
    const status = fragment.querySelector<HTMLElement>('.app-row-status')
    const info = fragment.querySelector<HTMLButtonElement>('.app-info')
    if (!slot || !checkbox || !name || !profile || !profileName || !status || !info) continue

    name.textContent = `Instance ${instance.index} (${instance.name})`
    checkbox.setAttribute('aria-label', `Select instance ${instance.index}`)
    checkbox.addEventListener('change', () => {
      void updateSelection(instance.index)
    })

    profile.replaceChildren(...profileNames.map((profileOption) => new Option(profileOption, profileOption)))
    profile.setAttribute('aria-label', `Profile for instance ${instance.index}`)
    profile.addEventListener('change', () => {
      void updateSelection(instance.index)
    })

    info.setAttribute('aria-label', `Scheduled tasks for instance ${instance.index}`)
    info.addEventListener('pointerenter', () => {
      scheduleTasktip(instance.index)
    })
    info.addEventListener('pointerleave', scheduleHideTasktip)
    info.addEventListener('focus', () => {
      showTasktip(instance.index)
    })
    info.addEventListener('blur', () => {
      if (!tooltipPinned) hideTasktip()
    })
    info.addEventListener('click', () => {
      if (tooltipPinned && tooltipIndex === instance.index) hideTasktip()
      else showTasktip(instance.index, true)
    })

    const row: RowRefs = { slot, checkbox, profile, profileName, status, info, tooltip: instance.tooltip, visible: false, hideTimer: 0 }
    updateRow(row, instance, snapshot.tool_running)
    list.append(slot)
    rowNodes.set(instance.index, row)
    setRowVisible(row, !snapshot.tool_running || instance.checked, false)
  }

  updateEmpty(snapshot)
  updateLastVisible()
}

function renderRows(snapshot: Snapshot): void {
  const key = `${snapshot.instances.map((instance) => `${instance.index}:${instance.name}`).join(',')}|${Object.keys(snapshot.profiles).join(',')}`
  if (key !== rowKey) {
    buildRows(snapshot)
    rowKey = key
    return
  }

  for (const instance of snapshot.instances) {
    const row = rowNodes.get(instance.index)
    if (!row) continue
    updateRow(row, instance, snapshot.tool_running)
    setRowVisible(row, !snapshot.tool_running || instance.checked, true)
  }
  updateEmpty(snapshot)
  updateLastVisible()
  refreshTasktip()
}

function render(snapshot: Snapshot): void {
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
  const panel = el('task-tooltip')
  panel.addEventListener('pointerenter', () => {
    window.clearTimeout(tooltipTimer)
  })
  panel.addEventListener('pointerleave', scheduleHideTasktip)
  document.addEventListener('pointerdown', (event) => {
    if (!tooltipPinned || !(event.target instanceof Node)) return
    const row = tooltipIndex === null ? undefined : rowNodes.get(tooltipIndex)
    if (panel.contains(event.target) || row?.info.contains(event.target)) return
    hideTasktip()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideTasktip()
  })
  window.addEventListener('resize', positionTasktip)
  window.addEventListener('scroll', positionTasktip, true)
  subscribe(render)
}
