type InstanceRow = {
  index: number
  name: string
  checked: boolean
  profile: string
  status: string
  tooltip: string
  active: boolean
}

type EmulatorOption = { code: string; label: string; installed: boolean }

type Snapshot = {
  emulator: string
  emulator_label: string
  emulator_options: EmulatorOption[]
  tool_running: boolean
  max_instances: number
  instances: InstanceRow[]
  profiles: Record<string, string[]>
  tasks: { id: string; name: string; description: string; priority: number }[]
}

type LogEntry = { seq: number; time: number; level: string; message: string }
type DialogPayload = { title: string; text: string }
type ActionResult = { ok: boolean; error?: string | null }
type RowRefs = { checkbox: HTMLInputElement; profile: HTMLSelectElement; status: HTMLElement }

const MAX_LOG_LINES = 500

let token = ''
let rowKey = ''
let emulatorKey = ''
const rowNodes = new Map<number, RowRefs>()

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id}`)
  return node as T
}

function setConnection(label: string, state: 'connecting' | 'live' | 'error'): void {
  const node = el('connection')
  node.textContent = label
  node.dataset['state'] = state
}

function showDialog(title: string, text: string): void {
  const dialog = el<HTMLDialogElement>('dialog')
  el('dialog-title').textContent = title
  el('dialog-text').textContent = text
  if (!dialog.open) dialog.showModal()
}

function parseEvent<T>(event: Event): T {
  return JSON.parse((event as MessageEvent<string>).data) as T
}

async function request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-WosUtil-Token': token }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

async function runCommand(command: string, args: Record<string, unknown> = {}): Promise<void> {
  try {
    const result = await request<ActionResult>('/api/command', 'POST', { command, args })
    if (!result.ok) showDialog('WoS Util', result.error ?? 'The command failed.')
  } catch (error) {
    console.error(error)
    setConnection('Disconnected', 'error')
  }
}

async function updateSelection(index: number): Promise<void> {
  const row = rowNodes.get(index)
  if (!row) return
  await runCommand('update_selection', {
    index,
    checked: row.checkbox.checked,
    profile: row.profile.value,
  })
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
  el('start').classList.toggle('hidden', snapshot.tool_running)
  el('stop').classList.toggle('hidden', !snapshot.tool_running)
  el('refresh').classList.toggle('hidden', snapshot.tool_running)
  el('limit-field').classList.toggle('hidden', snapshot.tool_running)
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
    rowNodes.set(instance.index, { checkbox, profile, status })
  }

  list.classList.toggle('hidden', snapshot.instances.length === 0)
  el('empty').classList.toggle('hidden', snapshot.instances.length > 0)
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
  }
}

function render(snapshot: Snapshot): void {
  renderEmulator(snapshot)
  renderToolbar(snapshot)
  renderRows(snapshot)
}

function appendLogEntry(entry: LogEntry): void {
  const logNode = el('log')
  const atBottom = logNode.scrollTop + logNode.clientHeight >= logNode.scrollHeight - 32

  const line = document.createElement('div')
  line.className = 'app-log-line'

  const time = document.createElement('span')
  time.className = 'app-log-time'
  time.textContent = new Date(entry.time * 1000).toLocaleTimeString('en-GB', { hour12: false })

  const level = document.createElement('span')
  level.className = 'app-log-level'
  level.textContent = entry.level.toUpperCase()

  const message = document.createElement('span')
  message.textContent = ` ${entry.message}`

  line.append(time, document.createTextNode(' '), level, message)
  logNode.append(line)
  while (logNode.childElementCount > MAX_LOG_LINES) logNode.firstElementChild?.remove()
  if (atBottom) logNode.scrollTop = logNode.scrollHeight
}

function replaceLog(entries: LogEntry[]): void {
  el('log').replaceChildren()
  for (const entry of entries) appendLogEntry(entry)
}

function connectEvents(): void {
  const source = new EventSource(`/api/events?t=${encodeURIComponent(token)}`)
  source.addEventListener('open', () => setConnection('Live', 'live'))
  source.addEventListener('error', () => setConnection('Reconnecting…', 'error'))
  source.addEventListener('state', (event) => render(parseEvent<Snapshot>(event)))
  source.addEventListener('logs', (event) => replaceLog(parseEvent<{ entries: LogEntry[] }>(event).entries))
  source.addEventListener('log', (event) => appendLogEntry(parseEvent<LogEntry>(event)))
  source.addEventListener('dialog', (event) => {
    const payload = parseEvent<DialogPayload>(event)
    showDialog(payload.title, payload.text)
  })
}

export function initApp(): void {
  token = new URLSearchParams(location.search).get('t') ?? ''
  if (!token) {
    setConnection('Missing token', 'error')
    return
  }

  el('start').addEventListener('click', () => {
    void runCommand('start_tool')
  })
  el('stop').addEventListener('click', () => {
    void runCommand('stop_tool')
  })
  el('refresh').addEventListener('click', () => {
    void runCommand('refresh_instances')
  })
  el<HTMLInputElement>('limit').addEventListener('change', (event) => {
    const value = Number((event.target as HTMLInputElement).value)
    if (Number.isFinite(value)) void runCommand('set_max_instances', { value })
  })
  el<HTMLSelectElement>('emulator').addEventListener('change', (event) => {
    void runCommand('set_emulator', { emulator: (event.target as HTMLSelectElement).value })
  })

  void request<Snapshot>('/api/state', 'GET')
    .then(render)
    .catch((error: unknown) => {
      console.error(error)
      setConnection('Disconnected', 'error')
    })
  void request('/api/resume', 'POST', {}).catch(() => {})
  window.setInterval(() => {
    void request('/api/heartbeat', 'POST', {}).catch(() => {})
  }, 3000)
  window.addEventListener('pagehide', () => {
    navigator.sendBeacon(`/api/suspend?t=${encodeURIComponent(token)}`)
  })

  connectEvents()
}
