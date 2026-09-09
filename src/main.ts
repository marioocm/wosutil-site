import { mountRallyCallers } from './components/rally-callers'
import { mountRallyQueue } from './components/rally-queue'
import { getDefaultDurationSec, getSelectedCallers } from './rally-selection'
import type { RallyCaller } from './rally-callers'
import { clamp, clampInput, formatUtcClock, pad2, padInput, parseSecondsInput, splitSeconds } from './timer'

const TICK_MS = 250

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element #${id}`)
  return element
}

const minutesDisplay = getElement('minutes')
const secondsDisplay = getElement('seconds')
const clockElement = getElement('utc-clock')
const statusElement = getElement('status')
const minutesInput = getElement('minutes-input') as HTMLInputElement
const secondsInput = getElement('seconds-input') as HTMLInputElement
const playButton = getElement('play-button') as HTMLButtonElement
const resetButton = getElement('reset-button') as HTMLButtonElement
const clearButton = getElement('clear-button') as HTMLButtonElement
const rallyPanel = getElement('rally-panel')
const rallyCallers = mountRallyCallers(rallyPanel)
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
rallyCallers.onSelectionChange(syncQueueSelection)
rallyQueue.onUseMax3(() => {
  if (running) return
  const next = getDefaultDurationSec(currentSelection())
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
  rallyQueue.tick(Math.ceil(remainingMs / 1000), running)
  render()
}, TICK_MS)