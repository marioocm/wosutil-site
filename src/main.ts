import { mountRallyCallers } from './components/rally-callers'
import { mountRallyQueue } from './components/rally-queue'
import { ENEMY_STORAGE_KEY } from './rally-callers'
import { getBufferDurationSec, getDefaultDurationSec, getSelectedCallers } from './rally-selection'
import type { RallyCaller } from './rally-callers'
import {
  applySharedState,
  buildShareUrl,
  collectShareState,
  hasExistingState,
  parseShareFromHash,
} from './share'
import { clamp, clampInput, formatUtcClock, pad2, padInput, parseSecondsInput, splitSeconds } from './timer'

const TICK_MS = 250

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element #${id}`)
  return element
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API unavailable (permissions, insecure context): fallback.
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('aria-hidden', 'true')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

function maybeImportSharedState(): void {
  const payload = parseShareFromHash(window.location.hash)
  if (!payload) return
  const needsConfirm = hasExistingState(localStorage)
  const accepted =
    !needsConfirm ||
    window.confirm('This link contains shared rally data. Replace your current lists?')
  if (accepted) applySharedState(localStorage, payload, Date.now())
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

maybeImportSharedState()
window.addEventListener('hashchange', () => {
  // Pasting a share link into the open page only changes the hash (no reload).
  if (parseShareFromHash(window.location.hash)) window.location.reload()
})

const minutesDisplay = getElement('minutes')
const secondsDisplay = getElement('seconds')
const clockElement = getElement('utc-clock')
const statusElement = getElement('status')
const minutesInput = getElement('minutes-input') as HTMLInputElement
const secondsInput = getElement('seconds-input') as HTMLInputElement
const playButton = getElement('play-button') as HTMLButtonElement
const resetButton = getElement('reset-button') as HTMLButtonElement
const clearButton = getElement('clear-button') as HTMLButtonElement
const shareButton = getElement('share-button') as HTMLButtonElement
const rallyPanel = getElement('rally-panel')
const rallyCallers = mountRallyCallers(rallyPanel)
const enemyCallers = mountRallyCallers(getElement('enemy-panel'), {
  storageKey: ENEMY_STORAGE_KEY,
  selectable: false,
  callerLabel: 'Enemy caller',
  emptyText: 'No enemy callers yet. Add the first above.',
  idPrefix: 'enemy',
})
const rallyQueue = mountRallyQueue(getElement('rally-queue'))

const MAX_MINUTES = 99
const MAX_SECONDS = 59

let configuredSeconds = 0
let remainingMs = 0
let running = false
let finished = false
let endTime = 0

function readMinutes(): number {
  return clamp(parseSecondsInput(minutesInput.value), 0, MAX_MINUTES)
}

function readSeconds(): number {
  return clamp(parseSecondsInput(secondsInput.value), 0, MAX_SECONDS)
}

function readDurationSeconds(): number {
  return readMinutes() * 60 + readSeconds()
}

function syncInputs(): void {
  minutesInput.value = configuredSeconds === 0 ? '' : Math.floor(configuredSeconds / 60).toString()
  secondsInput.value = configuredSeconds === 0 ? '' : (configuredSeconds % 60).toString()
}

function currentSelection(): RallyCaller[] {
  return getSelectedCallers(rallyCallers.getCallers(), rallyCallers.getSelection())
}

function maybeAutoDuration(selected: RallyCaller[]): void {
  if (running || configuredSeconds !== 0) return
  const next = getDefaultDurationSec(selected)
  if (next === null) return
  configuredSeconds = next
  remainingMs = next * 1000
  finished = false
  syncInputs()
}

function syncQueueSelection(): void {
  const selected = currentSelection()
  rallyQueue.setSelected(selected)
  maybeAutoDuration(selected)
  render()
}

function onInputsChange(): void {
  if (running) return
  minutesInput.value = clampInput(minutesInput.value, MAX_MINUTES)
  secondsInput.value = clampInput(secondsInput.value, MAX_SECONDS)
  configuredSeconds = readDurationSeconds()
  remainingMs = configuredSeconds * 1000
  finished = false
  rallyQueue.restore()
  render()
}

function padInputField(input: HTMLInputElement): void {
  input.value = padInput(input.value)
}

function normalizeInputs(): void {
  const minutes = readMinutes()
  const seconds = readSeconds()
  minutesInput.value = minutes === 0 ? '00' : minutes.toString()
  secondsInput.value = pad2(seconds)
}

function onPlay(): void {
  if (running) {
    running = false
    remainingMs = Math.max(0, endTime - Date.now())
  } else {
    const fresh = remainingMs <= 0 || finished
    if (remainingMs <= 0) {
      configuredSeconds = readDurationSeconds()
      remainingMs = configuredSeconds * 1000
    }
    if (remainingMs <= 0) return
    if (fresh) rallyQueue.restore()
    finished = false
    running = true
    endTime = Date.now() + remainingMs
    normalizeInputs()
  }
  render()
}

function onReset(): void {
  running = false
  remainingMs = configuredSeconds * 1000
  finished = false
  rallyQueue.restore()
  render()
}

function onClear(): void {
  running = false
  finished = false
  configuredSeconds = 0
  remainingMs = 0
  endTime = 0
  syncInputs()
  rallyQueue.restore()
  render()
}

async function onShare(): Promise<void> {
  const url = buildShareUrl(
    window.location.href,
    collectShareState(
      rallyCallers.getCallers(),
      enemyCallers.getCallers(),
      rallyCallers.getSelection(),
    ),
  )
  const ok = await copyText(url)
  shareButton.textContent = ok ? 'Copied!' : 'Copy failed'
  window.setTimeout(() => {
    if (shareButton.isConnected) shareButton.textContent = 'Share'
  }, 1500)
}

function render(): void {
  const displaySeconds = Math.ceil(remainingMs / 1000)
  const { minutes, seconds } = splitSeconds(displaySeconds)
  minutesDisplay.textContent = pad2(minutes)
  secondsDisplay.textContent = pad2(seconds)
  clockElement.textContent = `UTC: ${formatUtcClock(new Date())}`
  playButton.textContent = running ? 'Pause' : 'Play'
  minutesInput.disabled = running
  secondsInput.disabled = running
  resetButton.disabled = configuredSeconds === 0
  if (finished) {
    statusElement.textContent = "Time's up"
    statusElement.classList.remove('invisible')
  } else {
    statusElement.classList.add('invisible')
  }
}

minutesInput.addEventListener('input', onInputsChange)
secondsInput.addEventListener('input', onInputsChange)
secondsInput.addEventListener('blur', () => padInputField(secondsInput))
secondsInput.addEventListener('change', () => padInputField(secondsInput))
playButton.addEventListener('click', onPlay)
resetButton.addEventListener('click', onReset)
clearButton.addEventListener('click', onClear)
shareButton.addEventListener('click', () => {
  void onShare()
})
rallyCallers.onSelectionChange(syncQueueSelection)
rallyQueue.onApplyBuffer((bufferSec) => {
  if (running) return
  const next = getBufferDurationSec(currentSelection(), bufferSec)
  if (next === null) return
  configuredSeconds = next
  remainingMs = next * 1000
  finished = false
  syncInputs()
  rallyQueue.restore()
  render()
})

syncQueueSelection()
render()
setInterval(() => {
  if (running) {
    remainingMs = Math.max(0, endTime - Date.now())
    if (remainingMs === 0) {
      running = false
      finished = true
    }
  }
  rallyCallers.refresh(Date.now())
  enemyCallers.refresh(Date.now())
  rallyQueue.tick(Math.ceil(remainingMs / 1000), running, endTime)
  render()
}, TICK_MS)