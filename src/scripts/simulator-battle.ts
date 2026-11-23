import { applyModifierControls } from '../lib/modifier-controls'
import { buildSimulatorBattle } from '../lib/report-battle'
import { reportPath, type ReportDetail } from '../lib/reports'
import { dispatchSimulatorLoad } from '../lib/simulator-load'
import { emptyBuffs } from '../lib/stat-buffs'

const BATTLE_ID = /^[0-9a-f]{16,64}$/i
const REQUEST_TIMEOUT_MS = 15_000

function setStatus(
  element: HTMLElement | null,
  message: string,
  error = false,
): void {
  if (!element) return
  element.hidden = false
  element.textContent = message
  element.style.color = error ? 'var(--negative)' : ''
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return `API error ${status}`
}

function isReportDetail(value: unknown): value is ReportDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { attacker?: unknown }).attacker === 'object' &&
    (value as { attacker?: unknown }).attacker !== null &&
    typeof (value as { defender?: unknown }).defender === 'object' &&
    (value as { defender?: unknown }).defender !== null
  )
}

/** Loads `?battle=<report id>` into the simulator widgets. */
export function initSimulatorBattle(): void {
  const id = new URLSearchParams(window.location.search).get('battle')?.trim() ?? ''
  if (!BATTLE_ID.test(id)) return

  const status = document.querySelector<HTMLElement>('[data-battle-load-status]')
  const shortId = id.slice(0, 8)
  setStatus(status, `Loading battle report ${shortId}…`)

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  void (async () => {
    try {
      const response = await fetch(reportPath(id), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(errorMessage(payload, response.status))
      if (!isReportDetail(payload)) throw new Error('Invalid report response.')

      const battle = buildSimulatorBattle(payload)
      applyModifierControls(document, 'left', emptyBuffs())
      applyModifierControls(document, 'right', emptyBuffs())
      dispatchSimulatorLoad(battle)
      setStatus(
        status,
        `Loaded report ${shortId}. Edit any value, then press Simulate.`,
      )
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The report request timed out.'
          : error instanceof Error
            ? error.message
            : String(error)
      setStatus(
        status,
        `Could not load battle report ${shortId}: ${message}`,
        true,
      )
    } finally {
      window.clearTimeout(timeout)
    }
  })()
}
