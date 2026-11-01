import { TROOP_TYPES } from '../lib/heroes'
import {
  buildOptimizeCase,
  createSeedBase,
  engineSide,
  formatSimulationFailure,
  OPTIMIZE_RATIO_SEEDS,
  OPTIMIZE_RATIO_STEP,
  readSimulatorState,
  validateSimulatorState,
  type OptimizeRatioCandidate,
  type OptimizeRatioResult,
} from '../lib/simulation'

const DEFAULT_API = 'http://localhost:8000'

class OptimizeRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OptimizeRequestError'
  }
}

function resolveApiBase(): string {
  const query = new URLSearchParams(window.location.search).get('api')
  const configured = import.meta.env.PUBLIC_SIM_API
  return (query || configured || DEFAULT_API).replace(/\/+$/, '')
}

function isLocalApi(base: string): boolean {
  try {
    const host = new URL(base).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (detail) return JSON.stringify(detail)
  }
  return `API error ${status}`
}

function retryAfterSeconds(response: Response): number | null {
  const header = response.headers.get('Retry-After')?.trim()
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds)
  const date = Date.parse(header)
  if (Number.isNaN(date)) return null
  return Math.max(1, Math.ceil((date - Date.now()) / 1000))
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1)
}

function formatPercent(value: number): string {
  return `${(clampRate(value) * 100).toFixed(1)}%`
}

function formatMargin(value: number): string {
  const margin = Number.isFinite(value) ? value : 0
  return `${margin >= 0 ? '+' : ''}${(margin * 100).toFixed(1)}%`
}

function applyCounts(
  side: 'left' | 'right',
  counts: Record<string, number>,
): boolean {
  const root = document.querySelector<HTMLElement>(`[data-troop-power-side="${side}"]`)
  if (!root) return false
  let trigger: HTMLInputElement | null = null
  for (const { id } of TROOP_TYPES) {
    const input = root.querySelector<HTMLInputElement>(
      `[data-troop-type="${id}"] input[data-troop-count]`,
    )
    if (!input) continue
    input.value = String(Math.max(0, Math.round(counts[id] ?? 0)))
    trigger = input
  }
  trigger?.dispatchEvent(new Event('input', { bubbles: true }))
  return trigger !== null
}

export function initOptimiseRatio(): void {
  const section = document.querySelector<HTMLElement>('[data-optimise-ratio]')
  const toggle = section?.querySelector<HTMLElement>('[data-optimise-toggle]')
  const button = section?.querySelector<HTMLButtonElement>('[data-optimise-ratio-button]')
  const status = section?.querySelector<HTMLElement>('[data-optimise-status]')
  const resultsRoot = section?.querySelector<HTMLElement>('[data-optimise-results]')
  const rowsRoot = resultsRoot?.querySelector<HTMLElement>('[data-optimise-rows]')
  const caption = resultsRoot?.querySelector<HTMLElement>('[data-optimise-caption]')
  const meta = resultsRoot?.querySelector<HTMLElement>('[data-optimise-meta]')
  const warnings = resultsRoot?.querySelector<HTMLElement>('[data-optimise-warnings]')
  if (
    !section ||
    !toggle ||
    !button ||
    !status ||
    !resultsRoot ||
    !rowsRoot ||
    !caption ||
    !meta ||
    !warnings
  ) {
    return
  }
  const toggleElement: HTMLElement = toggle
  const buttonElement: HTMLButtonElement = button
  const statusElement: HTMLElement = status
  const resultsElement: HTMLElement = resultsRoot
  const rowsElement: HTMLElement = rowsRoot
  const captionElement: HTMLElement = caption
  const metaElement: HTMLElement = meta
  const warningsElement: HTMLElement = warnings
  const shell = section.closest<HTMLElement>('[data-simulation-shell]')
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const radios = [
    ...toggle.querySelectorAll<HTMLInputElement>('input[name="optimise-ratio-side"]'),
  ]
  if (radios.length === 0) return

  const apiBase = resolveApiBase()
  let activeController: AbortController | null = null
  let runId = 0

  function checkedRadio(): HTMLInputElement | null {
    return radios.find((radio) => radio.checked) ?? null
  }

  function selectedSide(): 'left' | 'right' {
    return checkedRadio()?.value === 'right' ? 'right' : 'left'
  }

  function show(radio: HTMLInputElement | null): void {
    const side = radio?.value ?? checkedRadio()?.value ?? radios[0]?.value
    if (side === undefined) return
    toggleElement.dataset['side'] = side
  }

  function setStatus(message: string): void {
    statusElement.textContent = message
  }

  function hideResults(): void {
    resultsElement.dataset['expanded'] = 'false'
    resultsElement.hidden = true
    rowsElement.replaceChildren()
    captionElement.textContent = ''
    metaElement.textContent = ''
    warningsElement.hidden = true
    warningsElement.textContent = ''
  }

  function revealResults(): void {
    if (!resultsElement.hidden && resultsElement.dataset['expanded'] === 'true') return
    resultsElement.hidden = false
    shell?.setAttribute('data-has-result', 'true')
    if (reduceMotion.matches) {
      resultsElement.dataset['expanded'] = 'true'
      return
    }
    window.requestAnimationFrame(() => {
      resultsElement.dataset['expanded'] = 'true'
    })
  }

  function failureMessage(error: unknown): string {
    if (error instanceof OptimizeRequestError) return error.message
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'The ratio optimizer timed out. Try again.'
    }
    if (error instanceof TypeError) {
      return formatSimulationFailure(
        { kind: 'network' },
        { apiBase, localApi: isLocalApi(apiBase) },
      )
    }
    return formatSimulationFailure({
      kind: 'api',
      detail: error instanceof Error ? error.message : String(error),
    })
  }

  function renderRow(
    candidate: OptimizeRatioCandidate,
    result: OptimizeRatioResult,
    side: 'left' | 'right',
  ): HTMLButtonElement {
    const isBest = candidate.ratio_text === result.best.ratio_text
    const metricColor = isBest ? 'text-ink' : 'text-ink-muted'
    const row = document.createElement('button')
    row.type = 'button'
    row.className = [
      'optimise-ratio-row w-full cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
      isBest ? 'bg-tint/40 hover:bg-tint/60' : 'hover:bg-tint/40',
    ].join(' ')
    row.setAttribute(
      'aria-label',
      `Apply ${candidate.ratio_text}: ${formatPercent(candidate.p_win)} wins, margin ${formatMargin(candidate.margin)}${isBest ? ', best ratio' : ''}`,
    )

    const ratio = document.createElement('span')
    ratio.className = 'optimise-ratio-value font-mono leading-tight tabular-nums text-ink'
    ratio.textContent = candidate.ratio_text

    const win = document.createElement('span')
    win.className = `optimise-ratio-metric text-right font-mono leading-tight tabular-nums ${metricColor}`
    win.textContent = formatPercent(candidate.p_win)

    const margin = document.createElement('span')
    margin.className = `optimise-ratio-metric text-right font-mono leading-tight tabular-nums ${metricColor}`
    margin.textContent = formatMargin(candidate.margin)

    row.append(ratio, win, margin)
    row.addEventListener('click', () => {
      if (!applyCounts(side, candidate.counts)) {
        setStatus('Could not update the troop counts. Change them manually.')
        return
      }
      setStatus(`Applied ${candidate.ratio_text} to the ${side} side.`)
    })
    return row
  }

  function renderResults(result: OptimizeRatioResult, side: 'left' | 'right'): void {
    const sideLabel = side === 'left' ? 'Left' : 'Right'
    const elapsed = Number.isFinite(result.elapsed_ms)
      ? `${Math.round(result.elapsed_ms)} ms`
      : ''
    captionElement.textContent = `${sideLabel} side`
    metaElement.textContent = [`${result.seeds} seeds`, elapsed].filter(Boolean).join(' · ')
    rowsElement.replaceChildren(
      ...result.results.map((candidate) => renderRow(candidate, result, side)),
    )
    const warningList = result.warnings ?? []
    warningsElement.hidden = warningList.length === 0
    warningsElement.textContent = warningList.join(' · ')
    revealResults()
  }

  toggleElement.addEventListener('change', () => {
    activeController?.abort()
    activeController = null
    runId += 1
    show(null)
    hideResults()
    setStatus('')
  })

  buttonElement.addEventListener('click', async () => {
    if (buttonElement.disabled) return
    const state = readSimulatorState()
    const problem = validateSimulatorState(state)
    if (problem) {
      setStatus(problem)
      return
    }

    const side = selectedSide()
    const run = ++runId
    const controller = new AbortController()
    activeController = controller
    const timeout = window.setTimeout(() => controller.abort(), 120_000)
    const label = buttonElement.textContent
    buttonElement.disabled = true
    buttonElement.textContent = 'Optimising...'
    section.setAttribute('aria-busy', 'true')
    setStatus('')

    try {
      const response = await fetch(`${apiBase}/v1/optimize-ratio`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case: buildOptimizeCase(state),
          side: engineSide(side),
          seeds: OPTIMIZE_RATIO_SEEDS,
          seed_base: createSeedBase(),
          step: OPTIMIZE_RATIO_STEP,
          top: 10,
        }),
        signal: controller.signal,
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status === 429) {
          const seconds = retryAfterSeconds(response)
          throw new OptimizeRequestError(
            seconds && seconds > 0
              ? `The ratio optimizer is busy. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`
              : 'The ratio optimizer is busy. Try again in a few seconds.',
          )
        }
        throw new OptimizeRequestError(errorMessage(payload, response.status))
      }
      if (run !== runId) return
      renderResults(payload as OptimizeRatioResult, side)
      setStatus('')
    } catch (error) {
      if (run === runId) setStatus(failureMessage(error))
    } finally {
      window.clearTimeout(timeout)
      if (activeController === controller) activeController = null
      section.removeAttribute('aria-busy')
      buttonElement.disabled = false
      buttonElement.textContent = label
    }
  })

  show(null)
}
