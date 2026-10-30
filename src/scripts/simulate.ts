import {
  buildEngineCase,
  formatSimulationResult,
  readSimulatorState,
  SIMULATION_SEEDS,
  validateSimulatorState,
  type SimulationResult,
} from '../lib/simulation'

const DEFAULT_API = 'http://localhost:8000'

function resolveApiBase(): string {
  const query = new URLSearchParams(window.location.search).get('api')
  const configured = import.meta.env.PUBLIC_SIM_API
  return (query || configured || DEFAULT_API).replace(/\/+$/, '')
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (detail) return JSON.stringify(detail)
  }
  return `API error ${status}`
}

export function initSimulation(): void {
  const section = document.querySelector<HTMLElement>('[data-simulation]')
  const button = section?.querySelector<HTMLButtonElement>('[data-simulate]')
  const output = section?.querySelector<HTMLTextAreaElement>('[data-simulate-result]')
  if (!section || !button || !output) return

  const apiBase = resolveApiBase()

  button.addEventListener('click', async () => {
    if (button.disabled) return

    const state = readSimulatorState()
    const problem = validateSimulatorState(state)
    if (problem) {
      output.value = problem
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120_000)
    const label = button.textContent
    button.disabled = true
    button.textContent = 'Simulating...'
    output.value = `Running ${SIMULATION_SEEDS} seeds against ${apiBase}...`
    output.setAttribute('aria-busy', 'true')

    try {
      const response = await fetch(`${apiBase}/v1/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case: buildEngineCase(state),
          seeds: SIMULATION_SEEDS,
          seed_base: 'web',
        }),
        signal: controller.signal,
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(errorMessage(payload, response.status))
      output.value = formatSimulationResult(payload as SimulationResult)
    } catch (error) {
      output.value =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The simulation timed out.'
          : `Simulation failed: ${error instanceof Error ? error.message : String(error)}\nIs the API running at ${apiBase}?`
    } finally {
      window.clearTimeout(timeout)
      output.removeAttribute('aria-busy')
      button.disabled = false
      button.textContent = label
    }
  })
}
