import { request, setToken } from './api'
import { showError } from './dialog'
import { setConnection } from './dom'
import { setSnapshot } from './store'
import { initTemplates, showTemplates } from './templates'
import type { Snapshot } from './types'

export async function initTemplatePage(): Promise<void> {
  const token = new URLSearchParams(location.search).get('t') ?? ''
  if (!token) {
    setConnection('Missing token', 'error')
    return
  }
  setToken(token)
  initTemplates()

  try {
    const state = await request<Snapshot>('/api/state', 'GET')
    setSnapshot(state)
    setConnection('Ready', 'live')
  } catch (error) {
    setConnection('Disconnected', 'error')
    showError(error instanceof Error ? error.message : String(error))
  }

  await showTemplates()
}
