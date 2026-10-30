import { TROOP_TYPES } from '../lib/heroes'
import {
  buildBattleSkillRows,
  buildEngineCase,
  formatActivations,
  formatBattleCount,
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
  let expanded = detailsContent.dataset['expanded'] === 'true'

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

    winrateLeft.textContent = formatWinRate(attRate)
    winrateRight.textContent = formatWinRate(defRate)
    winrateLeftBar.style.width = `${attRate * 100}%`
    winrateRightBar.style.width = `${defRate * 100}%`

    totalLeft.textContent = formatBattleCount(result.initial.att)
    totalRight.textContent = formatBattleCount(result.initial.def)
    survivorsLeft.textContent = formatBattleCount(result.att.total_mean)
    survivorsRight.textContent = formatBattleCount(result.def.total_mean)

    survivorRows.forEach((cells, index) => {
      cells.left.textContent = formatBattleCount(result.att.survivors_mean[index] ?? 0)
      cells.right.textContent = formatBattleCount(result.def.survivors_mean[index] ?? 0)
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

    setExpanded(false)
    shell?.setAttribute('data-has-result', 'true')
    resultRoot.hidden = false
    window.requestAnimationFrame(() => {
      const rect = resultRoot.getBoundingClientRect()
      if (rect.top >= 64 && rect.bottom <= window.innerHeight) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      resultRoot.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    })
  }

  detailsToggle.addEventListener('click', () => setExpanded(!expanded))
  setExpanded(expanded)

  button.addEventListener('click', async () => {
    if (button.disabled) return

    const state = readSimulatorState()
    const problem = validateSimulatorState(state)
    if (problem) {
      resultRoot.hidden = true
      setStatus(problem)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120_000)
    const label = button.textContent
    button.disabled = true
    button.textContent = 'Simulating...'
    resultRoot.hidden = true
    section.setAttribute('aria-busy', 'true')
    setStatus(`Running ${SIMULATION_SEEDS} seeds...`)

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
      renderResult(payload as SimulationResult, state)
      setStatus('')
    } catch (error) {
      setStatus(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The simulation timed out.'
          : `Simulation failed: ${error instanceof Error ? error.message : String(error)}. Is the API running at ${apiBase}?`,
      )
    } finally {
      window.clearTimeout(timeout)
      section.removeAttribute('aria-busy')
      button.disabled = false
      button.textContent = label
    }
  })
}
