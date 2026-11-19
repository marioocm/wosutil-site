import {
  getGenerationLineup,
  getGenerationPreset,
  onGenerationChange,
} from '../lib/generations'
import {
  COMBAT_STATS,
  composeSideStats,
  HERO_STAT_CONTRIBUTIONS,
  heroWidgetCounts,
  type SideStatPanel,
} from '../lib/hero-stats'
import { onHeroChange, type HeroChangeDetail } from '../lib/hero-events'
import { getHeroById, getHeroByName, TROOP_TYPES, type Hero } from '../lib/heroes'
import { applyModifierControls } from '../lib/modifier-controls'
import { maxBuffs } from '../lib/stat-buffs'
import {
  compareStatBonuses,
  formatStatBonus,
  normalizeStatBonus,
  parseStatBonus,
  sanitizeStatBonusInput,
  type StatComparison,
} from '../lib/stat-bonuses'

type Side = 'left' | 'right'

function resizeInput(input: HTMLInputElement): void {
  const display = input.value === '' ? input.placeholder : input.value
  const length = Math.max(display.length, 1)
  input.style.width = `min(calc(${length}ch + 1px), calc(100% - 1.5ch))`
}

function updateComparison(wrapper: HTMLElement | null, state: StatComparison): void {
  if (!wrapper) return
  wrapper.dataset['statState'] = state
}

function updateRow(row: HTMLElement): void {
  const left = row.querySelector<HTMLInputElement>('input[data-stat-side="left"]')
  const right = row.querySelector<HTMLInputElement>('input[data-stat-side="right"]')
  if (!left || !right) return

  const comparison = compareStatBonuses(left.value, right.value)
  updateComparison(row.querySelector<HTMLElement>('[data-stat-value="left"]'), comparison.left)
  updateComparison(row.querySelector<HTMLElement>('[data-stat-value="right"]'), comparison.right)
}

function updateSummary(table: HTMLElement, summary: HTMLElement): void {
  const leftLabel = table.dataset['leftLabel'] ?? 'Left'
  const rightLabel = table.dataset['rightLabel'] ?? 'Right'
  let leftHigher = 0
  let rightHigher = 0
  let tied = 0

  for (const row of table.querySelectorAll<HTMLElement>('[data-stat-row]')) {
    const left = row.querySelector<HTMLInputElement>('input[data-stat-side="left"]')
    const right = row.querySelector<HTMLInputElement>('input[data-stat-side="right"]')
    if (!left || !right) continue

    const comparison = compareStatBonuses(left.value, right.value)
    if (comparison.left === 'empty') continue
    if (comparison.left === 'higher') {
      leftHigher += 1
    } else if (comparison.right === 'higher') {
      rightHigher += 1
    } else {
      tied += 1
    }
  }

  if (leftHigher + rightHigher + tied === 0) {
    summary.textContent = 'Enter bonuses for both sides to compare.'
    return
  }

  summary.textContent = `${leftLabel} higher in ${leftHigher}, ${rightLabel} higher in ${rightHigher}, tied in ${tied}.`
}

export function initStatBonuses(): void {
  const table = document.querySelector<HTMLElement>('[data-stat-bonuses]')
  if (!table) return
  const root: HTMLElement = table
  const summary = document.getElementById('stat-bonuses-summary')

  function syncEnabled(): boolean {
    const toggle = document.querySelector<HTMLInputElement>('[data-sync-hero-stats]')
    return toggle?.checked ?? true
  }

  function setInput(side: Side, type: string, stat: string, value: number): void {
    const input = root.querySelector<HTMLInputElement>(`#stat-${type}-${stat}-${side}`)
    if (!input) return
    input.value = formatStatBonus(value)
    resizeInput(input)
  }

  function setPanel(side: Side, panel: SideStatPanel): void {
    for (const type of TROOP_TYPES) {
      for (const stat of COMBAT_STATS) {
        setInput(side, type.id, stat, panel[type.id][stat])
      }
    }
  }

  const WIDGET_LABELS: Record<(typeof COMBAT_STATS)[number], string> = {
    attack: 'ATK',
    defense: 'DEF',
    lethality: 'LETH',
    health: 'HP',
  }

  function updateWidgetSummaryFromHeroes(
    side: Side,
    heroes: Record<string, Hero | null>,
  ): void {
    const summaryNode = document.querySelector<HTMLElement>(
      `[data-modifiers-side="${side}"] [data-widget-summary]`,
    )
    if (!summaryNode) return
    const counts = heroWidgetCounts(
      TROOP_TYPES.flatMap(({ id }) => {
        const hero = heroes[id]
        return hero ? [hero] : []
      }),
      side,
    )
    const parts = COMBAT_STATS.filter((stat) => counts[stat] > 0).map(
      (stat) => `+${counts[stat] * 15}% ${WIDGET_LABELS[stat]}`,
    )
    summaryNode.textContent = parts.length > 0 ? `Widgets: ${parts.join(' · ')}` : 'Widgets: none'
  }

  function readHeroesFromDom(side: Side): Record<string, Hero | null> {
    const heroes: Record<string, Hero | null> = {}
    for (const { id } of TROOP_TYPES) {
      const caption = document.querySelector<HTMLElement>(
        `[data-hero-slot][data-hero-side="${side}"][data-hero-type="${id}"] [data-hero-caption]`,
      )
      const name = caption?.textContent?.trim() ?? ''
      heroes[id] = name === '' || name === 'Select' ? null : getHeroByName(name)
    }
    return heroes
  }

  function applyGeneration(generation: number): void {
    const preset = getGenerationPreset(generation)
    if (!preset) return

    for (const side of ['left', 'right'] as const) {
      const lineup = getGenerationLineup(preset, side)
      const lineupHeroes: Record<string, Hero | null> = {}
      for (const { id } of TROOP_TYPES) {
        lineupHeroes[id] = getHeroById(lineup.heroes[id])
      }
      updateWidgetSummaryFromHeroes(side, lineupHeroes)
      if (lineup.rawStats) {
        setPanel(side, {
          infantry: {
            attack: lineup.rawStats.infantry[0] ?? 0,
            defense: lineup.rawStats.infantry[1] ?? 0,
            lethality: lineup.rawStats.infantry[2] ?? 0,
            health: lineup.rawStats.infantry[3] ?? 0,
          },
          lancer: {
            attack: lineup.rawStats.lancer[0] ?? 0,
            defense: lineup.rawStats.lancer[1] ?? 0,
            lethality: lineup.rawStats.lancer[2] ?? 0,
            health: lineup.rawStats.lancer[3] ?? 0,
          },
          marksman: {
            attack: lineup.rawStats.marksman[0] ?? 0,
            defense: lineup.rawStats.marksman[1] ?? 0,
            lethality: lineup.rawStats.marksman[2] ?? 0,
            health: lineup.rawStats.marksman[3] ?? 0,
          },
        })
      } else {
        const heroes = TROOP_TYPES.flatMap(({ id }) => {
          const hero = lineupHeroes[id]
          return hero ? [hero] : []
        })
        setPanel(
          side,
          composeSideStats(preset.baseStat, heroes, side, {
            widgets: false,
            gear: true,
            alwaysOn: true,
          }),
        )
      }

      applyModifierControls(document, side, lineup.modifiers ?? maxBuffs())
    }

    for (const row of root.querySelectorAll<HTMLElement>('[data-stat-row]')) {
      updateRow(row)
    }
    if (summary) updateSummary(root, summary)
  }

  function applyHeroDelta(detail: HeroChangeDetail): void {
    updateWidgetSummaryFromHeroes(detail.side, readHeroesFromDom(detail.side))
    if (!syncEnabled() || detail.previousId === detail.heroId) return
    const before = detail.previousId ? HERO_STAT_CONTRIBUTIONS[detail.previousId] : undefined
    const after = detail.heroId ? HERO_STAT_CONTRIBUTIONS[detail.heroId] : undefined
    const attackDefense = (after?.attackDefense ?? 0) - (before?.attackDefense ?? 0)
    const lethalityHealth = (after?.lethalityHealth ?? 0) - (before?.lethalityHealth ?? 0)
    if (attackDefense === 0 && lethalityHealth === 0) return

    const read = (stat: string): number => {
      const input = root.querySelector<HTMLInputElement>(
        `#stat-${detail.type}-${stat}-${detail.side}`,
      )
      return parseStatBonus(input?.value) ?? 0
    }

    setInput(detail.side, detail.type, 'attack', read('attack') + attackDefense)
    setInput(detail.side, detail.type, 'defense', read('defense') + attackDefense)
    setInput(detail.side, detail.type, 'lethality', read('lethality') + lethalityHealth)
    setInput(detail.side, detail.type, 'health', read('health') + lethalityHealth)

    for (const row of root.querySelectorAll<HTMLElement>('[data-stat-row]')) {
      updateRow(row)
    }
    if (summary) updateSummary(root, summary)
  }

  onGenerationChange(applyGeneration)
  onHeroChange(applyHeroDelta)

  table.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return
    if (!event.target.matches('input[data-stat-side]')) return

    const caret = event.target.selectionStart ?? event.target.value.length
    const edit = sanitizeStatBonusInput(event.target.value, caret)
    if (edit.value !== event.target.value) {
      event.target.value = edit.value
      event.target.setSelectionRange(edit.caret, edit.caret)
    }
    resizeInput(event.target)

    const row = event.target.closest<HTMLElement>('[data-stat-row]')
    if (row) updateRow(row)
  })

  table.addEventListener('focusout', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return
    if (!event.target.matches('input[data-stat-side]')) return

    const normalized = normalizeStatBonus(event.target.value)
    if (normalized !== event.target.value) {
      event.target.value = normalized
      const row = event.target.closest<HTMLElement>('[data-stat-row]')
      if (row) updateRow(row)
    }
    resizeInput(event.target)
  })

  table.addEventListener('change', () => {
    if (summary) updateSummary(table, summary)
  })

  for (const input of table.querySelectorAll<HTMLInputElement>('input[data-stat-side]')) {
    resizeInput(input)
  }
  for (const row of table.querySelectorAll<HTMLElement>('[data-stat-row]')) {
    updateRow(row)
  }
  if (summary) updateSummary(table, summary)
  updateWidgetSummaryFromHeroes('left', readHeroesFromDom('left'))
  updateWidgetSummaryFromHeroes('right', readHeroesFromDom('right'))
}
