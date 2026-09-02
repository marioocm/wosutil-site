import { clamp, clampInput, formatUtcClock, pad2, parseSecondsInput, splitSeconds } from './timer'

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

function onInputsChange(): void {
  if (running) return
  minutesInput.value = clampInput(minutesInput.value, MAX_MINUTES)
  secondsInput.value = clampInput(secondsInput.value, MAX_SECONDS)
  configuredSeconds = readDurationSeconds()
  remainingMs = configuredSeconds * 1000
  finished = false
  render()
}

function onPlay(): void {
  if (running) {
    running = false
    remainingMs = Math.max(0, endTime - Date.now())
  } else {
    if (remainingMs <= 0) {
      configuredSeconds = readDurationSeconds()
      remainingMs = configuredSeconds * 1000
    }
    if (remainingMs <= 0) return
    finished = false
    running = true
    endTime = Date.now() + remainingMs
  }
  render()
}

function onReset(): void {
  running = false
  remainingMs = configuredSeconds * 1000
  finished = false
  render()
}

function onClear(): void {
  running = false
  finished = false
  configuredSeconds = 0
  remainingMs = 0
  endTime = 0
  syncInputs()
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
  } else if (configuredSeconds === 0) {
    statusElement.textContent = 'Set a duration and press play'
    statusElement.classList.remove('invisible')
  } else {
    statusElement.classList.add('invisible')
  }
}

minutesInput.addEventListener('input', onInputsChange)
secondsInput.addEventListener('input', onInputsChange)
playButton.addEventListener('click', onPlay)
resetButton.addEventListener('click', onReset)
clearButton.addEventListener('click', onClear)

render()
setInterval(() => {
  if (running) {
    remainingMs = Math.max(0, endTime - Date.now())
    if (remainingMs === 0) {
      running = false
      finished = true
    }
  }
  render()
}, TICK_MS)