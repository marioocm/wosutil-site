import { createSegmentedToggle } from '../components/segmented-toggle'
import { resetEngine, runLocalOptimizeRatio } from '../lib/engine/client'
import { TROOP_TYPES } from '../lib/heroes'
import { createLoadingController } from '../lib/loading-state'
import { distributeTroopCounts, parseTroopCount } from '../lib/troop-power'
import {
  buildOptimizeCase,
  createSeedBase,
  engineSide,
  OPTIMIZE_RATIO_SEEDS,
  OPTIMIZE_RATIO_STEP,
  readSimulatorState,
  validateSimulatorState,
  type OptimizeRatioCandidate,
  type OptimizeRatioResult,
} from '../lib/simulation'

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
    const inputs = [
      ...root.querySelectorAll<HTMLInputElement>(
        `[data-troop-type="${id}"] input[data-troop-count]`,
      ),
    ]
    if (inputs.length === 0) continue
    const weights = inputs.map((input) => parseTroopCount(input.value) ?? 0)
    const classTotal = Math.max(0, Math.round(counts[id] ?? 0))
    const next = distributeTroopCounts(classTotal, weights)
    inputs.forEach((input, index) => {
      input.value = String(next[index] ?? 0)
    })
    trigger = inputs.at(-1) ?? trigger
  }
  trigger?.dispatchEvent(new Event('input', { bubbles: true }))
  return trigger !== null
}

export function initOptimiseRatio(): void {
  const section = document.querySelector<HTMLElement>('[data-optimise-ratio]')
  const sideRoot = section?.querySelector<HTMLElement>('[data-optimise-side]')
  const button = section?.querySelector<HTMLButtonElement>('[data-optimise-ratio-button]')
  const status = section?.querySelector<HTMLElement>('[data-optimise-status]')
  const resultsRoot = section?.querySelector<HTMLElement>('[data-optimise-results]')
  const rowsRoot = resultsRoot?.querySelector<HTMLElement>('[data-optimise-rows]')
  const caption = resultsRoot?.querySelector<HTMLElement>('[data-optimise-caption]')
  const meta = resultsRoot?.querySelector<HTMLElement>('[data-optimise-meta]')
  const warnings = resultsRoot?.querySelector<HTMLElement>('[data-optimise-warnings]')
  const spinner = section?.querySelector<HTMLElement>('[data-optimise-spinner]')
  const buttonLabel = section?.querySelector<HTMLElement>('[data-optimise-label]')
  const progress = section?.querySelector<HTMLElement>('[data-optimise-progress]')
  if (
    !section ||
    !sideRoot ||
    !button ||
    !status ||
    !resultsRoot ||
    !rowsRoot ||
    !caption ||
    !meta ||
    !warnings ||
    !spinner ||
    !buttonLabel ||
    !progress
  ) {
    return
  }
  const sectionElement: HTMLElement = section
  const buttonElement: HTMLButtonElement = button
  const statusElement: HTMLElement = status
  const resultsElement: HTMLElement = resultsRoot
  const rowsElement: HTMLElement = rowsRoot
  const captionElement: HTMLElement = caption
  const metaElement: HTMLElement = meta
  const warningsElement: HTMLElement = warnings
  const spinnerElement: HTMLElement = spinner
  const labelElement: HTMLElement = buttonLabel
  const progressElement: HTMLElement = progress
  const loading = createLoadingController({
    section: sectionElement,
    button: buttonElement,
    label: labelElement,
    spinner: spinnerElement,
    progress: progressElement,
    busyLabel: 'Optimising',
  })
  const shell = section.closest<HTMLElement>('[data-simulation-shell]')
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let runId = 0

  const sideToggle = createSegmentedToggle<'left' | 'right'>({
    name: 'optimise-ratio-side',
    label: 'Side to optimise (attacker or defender)',
    options: [
      { value: 'left', label: 'Attacker' },
      { value: 'right', label: 'Defender' },
    ],
    value: 'left',
    className: 'w-[10rem]',
    onChange: () => {
      resetEngine()
      runId += 1
      loading.set(false)
      hideResults()
      setStatus('')
    },
  })
  sideRoot.replaceChildren(sideToggle.element)

  function selectedSide(): 'left' | 'right' {
    return sideToggle.value
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
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'The ratio optimizer was stopped. Try again.'
    }
    return `Optimization failed: ${error instanceof Error ? error.message : String(error)}`
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
    const sideLabel = side === 'left' ? 'Attacker' : 'Defender'
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
    const timeout = window.setTimeout(() => {
      if (run !== runId) return
      runId += 1
      resetEngine()
      loading.set(false)
      setStatus('The ratio optimizer timed out. Try again.')
    }, 120_000)
    loading.set(true)
    setStatus('')

    try {
      const result = (await runLocalOptimizeRatio({
        case: buildOptimizeCase(state),
        side: engineSide(side),
        seeds: OPTIMIZE_RATIO_SEEDS,
        seed_base: createSeedBase(),
        step: OPTIMIZE_RATIO_STEP,
        top: 10,
      })) as OptimizeRatioResult
      if (run !== runId) return
      renderResults(result, side)
      setStatus('')
    } catch (error) {
      if (run === runId) setStatus(failureMessage(error))
    } finally {
      window.clearTimeout(timeout)
      if (run === runId) loading.set(false)
    }
  })
}
