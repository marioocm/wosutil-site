import { TROOP_TYPES } from '../lib/heroes'
import {
  buildBattleSkillRows,
  buildEngineCase,
  formatActivations,
  formatBattleCount,
  formatSimulationFailure,
  formatWinRate,
  readSimulatorState,
  SIMULATION_SEEDS,
  validateSimulatorState,
  type BattleSkillRow,
  type BattleSkillRowPair,
  type SimulationResult,
  type SimulatorState,
} from '../lib/simulation'

const DEFAULT_API = 'http://localhost:8000'
const NUMBER_TWEEN_MS = 260

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

function retryAfterSeconds(response: Response): number | null {
  const header = response.headers.get('Retry-After')?.trim()
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds)
  const date = Date.parse(header)
  if (Number.isNaN(date)) return null
  return Math.max(1, Math.ceil((date - Date.now()) / 1000))
}

function isLocalApi(base: string): boolean {
  try {
    const host = new URL(base).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}

class SimulationRequestError extends Error {
  constructor(
    message: string,
    readonly rateLimited = false,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message)
    this.name = 'SimulationRequestError'
  }
}

function must<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Missing simulation element: ${selector}`)
  return element
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1)
}

export function initSimulation(): void {
  const section = document.querySelector<HTMLElement>('[data-simulation]')
  const button = section?.querySelector<HTMLButtonElement>('[data-simulate]')
  if (!section || !button) return

  const shell = section.closest<HTMLElement>('[data-simulation-shell]')
  const resultRoot = must<HTMLElement>(section, '[data-simulation-result]')
  const status = must<HTMLElement>(section, '[data-simulate-status]')
  const rounds = must<HTMLElement>(resultRoot, '[data-simulate-rounds]')
  const meta = must<HTMLElement>(resultRoot, '[data-simulate-meta]')
  const warnings = must<HTMLElement>(resultRoot, '[data-simulate-warnings]')
  const winrateLeft = must<HTMLElement>(resultRoot, '[data-battle-winrate-left]')
  const winrateRight = must<HTMLElement>(resultRoot, '[data-battle-winrate-right]')
  const winrateLeftBar = must<HTMLElement>(resultRoot, '[data-battle-winrate-left-bar]')
  const winrateRightBar = must<HTMLElement>(resultRoot, '[data-battle-winrate-right-bar]')
  const totalLeft = must<HTMLElement>(resultRoot, '[data-battle-total-left]')
  const totalRight = must<HTMLElement>(resultRoot, '[data-battle-total-right]')
  const survivorsLeft = must<HTMLElement>(resultRoot, '[data-battle-survivors-left]')
  const survivorsRight = must<HTMLElement>(resultRoot, '[data-battle-survivors-right]')
  const skillsBody = must<HTMLElement>(resultRoot, '[data-battle-skills-body]')
  const detailsToggle = must<HTMLButtonElement>(resultRoot, '[data-battle-details-toggle]')
  const detailsContent = must<HTMLElement>(resultRoot, '[data-battle-details-content]')
  const detailsIcon = resultRoot.querySelector<SVGElement>('[data-battle-details-icon]')
  const survivorRows = TROOP_TYPES.map((type) => ({
    left: must<HTMLElement>(
      resultRoot,
      `[data-battle-survivor-row="${type.id}"] [data-battle-survivor-left]`,
    ),
    right: must<HTMLElement>(
      resultRoot,
      `[data-battle-survivor-row="${type.id}"] [data-battle-survivor-right]`,
    ),
  }))

  const apiBase = resolveApiBase()
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const numberFrames = new WeakMap<HTMLElement, number>()
  const numberValues = new WeakMap<HTMLElement, number>()
  let expanded = detailsContent.dataset['expanded'] === 'true'

  function setNumber(
    element: HTMLElement,
    value: number,
    format: (current: number) => string,
  ): void {
    const frame = numberFrames.get(element)
    if (frame !== undefined) {
      window.cancelAnimationFrame(frame)
      numberFrames.delete(element)
    }

    const previous = numberValues.get(element)
    numberValues.set(element, value)

    if (previous === undefined || previous === value || reduceMotion.matches) {
      element.textContent = format(value)
      return
    }

    const start = performance.now()
    const step = (now: number): void => {
      const progress = Math.min((now - start) / NUMBER_TWEEN_MS, 1)
      const eased = 1 - (1 - progress) ** 3
      const current = previous + (value - previous) * eased
      numberValues.set(element, current)
      element.textContent = format(current)
      if (progress < 1) {
        numberFrames.set(element, window.requestAnimationFrame(step))
      } else {
        numberFrames.delete(element)
        element.textContent = format(value)
      }
    }
    numberFrames.set(element, window.requestAnimationFrame(step))
  }

  function scrollResultIntoView(): void {
    const rect = resultRoot.getBoundingClientRect()
    if (rect.top >= 64 && rect.bottom <= window.innerHeight) return
    resultRoot.scrollIntoView({
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  function revealResult(): void {
    if (!resultRoot.hidden) return
    resultRoot.hidden = false
    scrollResultIntoView()
    if (reduceMotion.matches) {
      resultRoot.dataset['expanded'] = 'true'
      return
    }
    window.requestAnimationFrame(() => {
      resultRoot.dataset['expanded'] = 'true'
    })
  }

  function setExpanded(next: boolean): void {
    expanded = next
    detailsContent.dataset['expanded'] = next ? 'true' : 'false'
    detailsContent.toggleAttribute('inert', !next)
    if (next) detailsContent.removeAttribute('aria-hidden')
    else detailsContent.setAttribute('aria-hidden', 'true')
    detailsToggle.setAttribute('aria-expanded', next ? 'true' : 'false')
    detailsToggle.setAttribute('aria-label', next ? 'Hide battle details' : 'Show battle details')
    detailsToggle.title = next ? 'Hide battle details' : 'Show battle details'
    detailsIcon?.classList.toggle('rotate-180', next)
  }

  function setStatus(message: string): void {
    status.textContent = message
  }

  function failureMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return formatSimulationFailure({ kind: 'timeout' })
    }
    if (error instanceof TypeError) {
      return formatSimulationFailure(
        { kind: 'network' },
        { apiBase, localApi: isLocalApi(apiBase) },
      )
    }
    if (error instanceof SimulationRequestError) {
      return formatSimulationFailure(
        error.rateLimited
          ? { kind: 'rate-limit', retryAfterSeconds: error.retryAfterSeconds }
          : { kind: 'api', detail: error.message },
      )
    }
    return formatSimulationFailure({
      kind: 'api',
      detail: error instanceof Error ? error.message : String(error),
    })
  }

  function cell(text: string, className: string): HTMLTableCellElement {
    const element = document.createElement('td')
    element.className = className
    element.textContent = text
    return element
  }

  function activationCell(row: BattleSkillRow): HTMLTableCellElement {
    const state = row.activations === null ? 'text-ink-subtle' : 'text-ink'
    return cell(
      formatActivations(row.activations),
      `battle-activation-value py-1 text-center font-mono tabular-nums ${state}`,
    )
  }

  function renderSkillRows(rows: readonly BattleSkillRowPair[]): void {
    const nodes = rows.map(({ kind, left, right }) => {
      const labelColor = kind === 'troop' ? 'text-ink-muted' : 'text-ink'
      const row = document.createElement('tr')
      row.className = 'border-t border-line'
      row.append(
        cell(left.label, `battle-skill-label py-1 text-left leading-tight ${labelColor}`),
        activationCell(left),
        cell('', 'py-1'),
        activationCell(right),
        cell(right.label, `battle-skill-label py-1 text-right leading-tight ${labelColor}`),
      )
      return row
    })
    skillsBody.replaceChildren(...nodes)
  }

  function renderResult(result: SimulationResult, state: SimulatorState): void {
    const attRate = clampRate(result.win_rate?.att ?? result.att_win_rate)
    const defRate = clampRate(result.win_rate?.def ?? 1 - attRate)
    const firstResult = resultRoot.hidden

    setNumber(winrateLeft, attRate, formatWinRate)
    setNumber(winrateRight, defRate, formatWinRate)
    winrateLeftBar.style.width = `${attRate * 100}%`
    winrateRightBar.style.width = `${defRate * 100}%`

    setNumber(totalLeft, result.initial.att, formatBattleCount)
    setNumber(totalRight, result.initial.def, formatBattleCount)
    setNumber(survivorsLeft, result.att.total_mean, formatBattleCount)
    setNumber(survivorsRight, result.def.total_mean, formatBattleCount)

    survivorRows.forEach((cells, index) => {
      setNumber(cells.left, result.att.survivors_mean[index] ?? 0, formatBattleCount)
      setNumber(cells.right, result.def.survivors_mean[index] ?? 0, formatBattleCount)
    })

    renderSkillRows(
      buildBattleSkillRows(
        { heroes: state.left.heroes, skills: result.skills?.att ?? [] },
        { heroes: state.right.heroes, skills: result.skills?.def ?? [] },
      ),
    )

    rounds.textContent = `Rounds ${result.rounds.mean.toFixed(1)} · min ${result.rounds.min} · max ${result.rounds.max}`
    meta.textContent = `${result.seeds} seeds · ${Math.round(result.elapsed_ms)} ms`
    const warningList = result.warnings ?? []
    warnings.hidden = warningList.length === 0
    warnings.textContent = warningList.join(' · ')

    shell?.setAttribute('data-has-result', 'true')
    if (firstResult) revealResult()
  }

  detailsToggle.addEventListener('click', () => setExpanded(!expanded))
  setExpanded(expanded)

  button.addEventListener('click', async () => {
    if (button.disabled) return

    const state = readSimulatorState()
    const problem = validateSimulatorState(state)
    if (problem) {
      setStatus(problem)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120_000)
    const label = button.textContent
    button.disabled = true
    button.textContent = 'Simulating...'
    section.setAttribute('aria-busy', 'true')
    setStatus(`Running ${SIMULATION_SEEDS} seeds...`)

    try {
      const response = await fetch(`${apiBase}/v1/simulate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case: buildEngineCase(state),
          seeds: SIMULATION_SEEDS,
          seed_base: 'web',
        }),
        signal: controller.signal,
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw response.status === 429
          ? new SimulationRequestError('rate limited', true, retryAfterSeconds(response))
          : new SimulationRequestError(errorMessage(payload, response.status))
      }
      renderResult(payload as SimulationResult, state)
      setStatus('')
    } catch (error) {
      setStatus(failureMessage(error))
    } finally {
      window.clearTimeout(timeout)
      section.removeAttribute('aria-busy')
      button.disabled = false
      button.textContent = label
    }
  })
}
