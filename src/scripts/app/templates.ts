import { getToken, request, runCommand } from './api'
import { showError } from './dialog'
import { el } from './dom'
import { setSnapshot, subscribe } from './store'
import type { Snapshot } from './types'

type TemplateImage = { rev: number; width: number; height: number; source: string; directory: string }
type Roi = { x: number; y: number; width: number; height: number }

let image: TemplateImage | null = null
let zoom = 1
let roi: Roi | null = null
let instanceKey = ''
let stateLoaded = false
let dragStart: { x: number; y: number } | null = null

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function updateStage(): void {
  if (!image || image.rev === 0) return
  const stage = el('template-stage')
  const selection = el('template-selection')
  stage.style.width = `${image.width * zoom}px`
  stage.style.height = `${image.height * zoom}px`
  if (!roi) {
    selection.hidden = true
    return
  }
  selection.hidden = false
  selection.style.left = `${roi.x * zoom}px`
  selection.style.top = `${roi.y * zoom}px`
  selection.style.width = `${roi.width * zoom}px`
  selection.style.height = `${roi.height * zoom}px`
  el('template-roi').textContent = `ROI: (${roi.x}, ${roi.y}, ${roi.width}, ${roi.height})`
}

function applyImage(next: TemplateImage): void {
  image = next
  zoom = 1
  roi = null
  el('template-roi').textContent = ''
  const stage = el('template-stage')
  const empty = el('template-empty')
  if (next.rev === 0 || next.width === 0 || next.height === 0) {
    stage.hidden = true
    empty.hidden = false
    el('template-status').textContent = `Templates: ${next.directory}`
    return
  }
  stage.hidden = false
  empty.hidden = true
  el('template-status').textContent = `${next.source} · ${next.width}×${next.height} · ${next.directory}`
  const img = el<HTMLImageElement>('template-image')
  img.onload = () => updateStage()
  img.src = `/api/template/image?rev=${next.rev}&t=${encodeURIComponent(getToken())}`
  updateStage()
}

function pointOnImage(event: PointerEvent): { x: number; y: number } | null {
  if (!image) return null
  const rect = el('template-overlay').getBoundingClientRect()
  return {
    x: clamp(Math.round((event.clientX - rect.left) / zoom), 0, image.width),
    y: clamp(Math.round((event.clientY - rect.top) / zoom), 0, image.height),
  }
}

function initSelection(): void {
  const overlay = el('template-overlay')
  overlay.addEventListener('pointerdown', (event) => {
    if (!image || event.button !== 0) return
    const point = pointOnImage(event)
    if (!point) return
    dragStart = point
    roi = { x: point.x, y: point.y, width: 0, height: 0 }
    overlay.setPointerCapture(event.pointerId)
    updateStage()
    event.preventDefault()
  })
  overlay.addEventListener('pointermove', (event) => {
    if (!dragStart) return
    const point = pointOnImage(event)
    if (!point) return
    const x = Math.min(dragStart.x, point.x)
    const y = Math.min(dragStart.y, point.y)
    roi = {
      x,
      y,
      width: Math.abs(point.x - dragStart.x),
      height: Math.abs(point.y - dragStart.y),
    }
    updateStage()
  })
  const finish = (event: PointerEvent) => {
    if (!dragStart) return
    dragStart = null
    if (overlay.hasPointerCapture(event.pointerId)) overlay.releasePointerCapture(event.pointerId)
    if (!roi || roi.width < 2 || roi.height < 2) {
      roi = null
      updateStage()
    }
  }
  overlay.addEventListener('pointerup', finish)
  overlay.addEventListener('pointercancel', finish)
}

function setZoom(next: number): void {
  zoom = clamp(next, 0.2, 5)
  updateStage()
}

async function loadImage(): Promise<void> {
  try {
    const picked = await request<{ ok: boolean; path: string | null }>('/api/pick-path', 'POST', { kind: 'file', title: 'Select image' })
    if (!picked.ok || !picked.path) return
    const result = await request<{ ok: boolean; image: TemplateImage; error?: string }>('/api/template/load', 'POST', { path: picked.path })
    if (!result.ok) {
      showError(result.error ?? 'Could not load the image.')
      return
    }
    applyImage(result.image)
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
  }
}

async function captureImage(): Promise<void> {
  const select = el<HTMLSelectElement>('template-instance')
  const index = Number(select.value)
  if (!Number.isFinite(index)) {
    showError('Select an emulator instance.')
    return
  }
  el('template-status').textContent = `Capturing instance ${index}…`
  try {
    const result = await request<{ ok: boolean; image?: TemplateImage; error?: string }>('/api/template/capture', 'POST', { index })
    if (!result.ok || !result.image) {
      el('template-status').textContent = ''
      showError(result.error ?? 'Could not capture the emulator screen.')
      return
    }
    applyImage(result.image)
  } catch (error) {
    el('template-status').textContent = ''
    showError(error instanceof Error ? error.message : String(error))
  }
}

async function saveTemplate(): Promise<void> {
  if (!image || !roi) {
    showError('Select a region first.')
    return
  }
  const path = el<HTMLInputElement>('template-path').value.trim() || 'template.png'
  try {
    const result = await request<{ ok: boolean; path?: string; error?: string }>('/api/template/save', 'POST', {
      path,
      roi: [roi.x, roi.y, roi.width, roi.height],
    })
    if (!result.ok) {
      showError(result.error ?? 'Could not save the template.')
      return
    }
    el('template-save-status').textContent = `Saved: ${result.path}`
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
  }
}

async function saveFull(): Promise<void> {
  if (!image) {
    showError('Load or capture an image first.')
    return
  }
  const path = el<HTMLInputElement>('template-full-path').value.trim()
  try {
    const result = await request<{ ok: boolean; path?: string; error?: string }>('/api/template/save-full', 'POST', { path })
    if (!result.ok) {
      showError(result.error ?? 'Could not save the screenshot.')
      return
    }
    el('template-save-status').textContent = `Saved: ${result.path}`
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
  }
}

async function copyRoi(): Promise<void> {
  if (!roi) {
    showError('Select a region first.')
    return
  }
  const text = `(${roi.x}, ${roi.y}, ${roi.width}, ${roi.height})`
  try {
    const result = await request<{ ok: boolean; error?: string }>('/api/template/copy', 'POST', { text })
    if (!result.ok) {
      showError(result.error ?? 'Could not copy the ROI.')
      return
    }
    el('template-save-status').textContent = `Copied: ${text}`
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
  }
}

function renderInstances(snapshot: Snapshot): void {
  const select = el<HTMLSelectElement>('template-instance')
  const key = snapshot.instances.map((instance) => `${instance.index}:${instance.name}`).join(',')
  if (key !== instanceKey) {
    instanceKey = key
    select.replaceChildren(...snapshot.instances.map((instance) => new Option(`Instance ${instance.index} (${instance.name})`, String(instance.index))))
  }
}

async function refreshInstances(): Promise<void> {
  await runCommand('refresh_instances')
  const state = await request<Snapshot>('/api/state', 'GET')
  setSnapshot(state)
}

export function initTemplates(): void {
  initSelection()
  el('template-refresh').addEventListener('click', () => {
    void refreshInstances()
  })
  el('template-load').addEventListener('click', () => {
    void loadImage()
  })
  el('template-capture').addEventListener('click', () => {
    void captureImage()
  })
  el('template-zoom-in').addEventListener('click', () => {
    setZoom(zoom * 1.25)
  })
  el('template-zoom-out').addEventListener('click', () => {
    setZoom(zoom / 1.25)
  })
  el('template-reset').addEventListener('click', () => {
    setZoom(1)
  })
  el('template-copy').addEventListener('click', () => {
    void copyRoi()
  })
  el('template-save').addEventListener('click', () => {
    void saveTemplate()
  })
  el('template-save-full').addEventListener('click', () => {
    void saveFull()
  })
  subscribe(renderInstances)
}

export async function showTemplates(): Promise<void> {
  if (stateLoaded) return
  try {
    const state = await request<{ ok: boolean; image: TemplateImage }>('/api/template/state', 'GET')
    if (state.ok) {
      stateLoaded = true
      applyImage(state.image)
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
  }
}
