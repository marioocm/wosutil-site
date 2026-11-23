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
  type CombatStat,
  type SideStatPanel,
} from '../lib/hero-stats'
import { onHeroChange, type HeroChangeDetail } from '../lib/hero-events'
import { getHeroById, getHeroByName, TROOP_TYPES, type Hero, type TroopType } from '../lib/heroes'
import {
  applyModifierControls,
  onModifierChange,
  readModifierControls,
} from '../lib/modifier-controls'
import {
  composeEffectiveStats,
  effectiveBuckets,
  emptyBuffs,
  maxBuffs,
  rawStat,
} from '../lib/stat-buffs'
import { onSimulatorLoad, type SimulatorLoadDetail } from '../lib/simulator-load'
import {
  compareStatBonuses,
  formatStatBonus,
  normalizeStatBonus,
  parseStatBonus,
  sanitizeStatBonusInput,
  type StatComparison,
} from '../lib/stat-bonuses'

type Side = 'left' | 'right'

function zeroPanel(): SideStatPanel {
  return {
    infantry: { attack: 0, defense: 0, lethality: 0, health: 0 },
    lancer: { attack: 0, defense: 0, lethality: 0, health: 0 },
    marksman: { attack: 0, defense: 0, lethality: 0, health: 0 },
  }
}

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
  const leftLabel = table.dataset['leftLabel'] ?? 'Attacker'
  const rightLabel = table.dataset['rightLabel'] ?? 'Defender'
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

function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left'
}

function heroList(heroes: Record<string, Hero | null>): Hero[] {
  return TROOP_TYPES.flatMap(({ id }) => {
    const hero = heroes[id]
    return hero ? [hero] : []
  })
}

export function initStatBonuses(): void {
  const table = document.querySelector<HTMLElement>('[data-stat-bonuses]')
  if (!table) return
  const root: HTMLElement = table
  const summary = document.getElementById('stat-bonuses-summary')
  const rawPanels: Record<Side, SideStatPanel> = {
    left: zeroPanel(),
    right: zeroPanel(),
  }

  function syncEnabled(): boolean {
    const toggle = document.querySelector<HTMLInputElement>('[data-sync-hero-stats]')
    return toggle?.checked ?? true
  }

  function statInput(side: Side, type: TroopType, stat: CombatStat): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>(`#stat-${type}-${stat}-${side}`)
  }

  function updateRows(): void {
    for (const row of root.querySelectorAll<HTMLElement>('[data-stat-row]')) {
      updateRow(row)
    }
    if (summary) updateSummary(root, summary)
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

  const WIDGET_LABELS: Record<CombatStat, string> = {
    attack: 'ATK',
    defense: 'DEF',
    lethality: 'LETH',
    health: 'HP',
  }

  function updateWidgetSummary(side: Side, heroes: readonly Hero[]): void {
    const summaryNode = document.querySelector<HTMLElement>(
      `[data-modifiers-side="${side}"] [data-widget-summary]`,
    )
    if (!summaryNode) return
    const counts = heroWidgetCounts(heroes, side)
    const parts = COMBAT_STATS.filter((stat) => counts[stat] > 0).map(
      (stat) => `+${counts[stat] * 15}% ${WIDGET_LABELS[stat]}`,
    )
    summaryNode.textContent = parts.length > 0 ? `Widgets: ${parts.join(' · ')}` : 'Widgets: none'
  }

  function setRawPanel(side: Side, panel: SideStatPanel): void {
    for (const type of TROOP_TYPES) {
      for (const stat of COMBAT_STATS) {
        rawPanels[side][type.id][stat] = panel[type.id][stat]
      }
    }
  }

  function panelFromStats(
    stats: Record<TroopType, readonly number[]>,
  ): SideStatPanel {
    const read = (type: TroopType, index: number): number => stats[type][index] ?? 0
    return {
      infantry: {
        attack: read('infantry', 0),
        defense: read('infantry', 1),
        lethality: read('infantry', 2),
        health: read('infantry', 3),
      },
      lancer: {
        attack: read('lancer', 0),
        defense: read('lancer', 1),
        lethality: read('lancer', 2),
        health: read('lancer', 3),
      },
      marksman: {
        attack: read('marksman', 0),
        defense: read('marksman', 1),
        lethality: read('marksman', 2),
        health: read('marksman', 3),
      },
    }
  }

  /**
   * Recompute the visible (effective) panel from the stored raw panel.
   *
   * The inputs are always the final stats the engine receives; the raw values
   * live in `data-raw-value` so a later buff toggle can rebuild the panel.
   */
  function displaySide(side: Side, heroesOverride?: readonly Hero[]): void {
    const own = readModifierControls(document, side)
    const foe = readModifierControls(document, otherSide(side))
    const heroes = heroesOverride ?? heroList(readHeroesFromDom(side))
    const effective = composeEffectiveStats(
      rawPanels[side],
      own,
      foe,
      heroWidgetCounts(heroes, side),
    )

    for (const type of TROOP_TYPES) {
      for (const stat of COMBAT_STATS) {
        const input = statInput(side, type.id, stat)
        if (!input) continue
        input.dataset['rawValue'] = String(rawPanels[side][type.id][stat])
        input.value = formatStatBonus(effective[type.id][stat])
        resizeInput(input)
      }
    }
    updateRows()
  }

  function displayAll(): void {
    displaySide('left')
    displaySide('right')
  }

  function applyManualEdit(input: HTMLInputElement): void {
    const parts = input.id.split('-')
    if (parts.length !== 4) return
    const type = TROOP_TYPES.find(({ id }) => id === parts[1])
    const stat = COMBAT_STATS.find((name) => name === parts[2])
    const side = parts[3] === 'left' || parts[3] === 'right' ? parts[3] : null
    if (!type || !stat || !side) return

    const effective = parseStatBonus(input.value)
    const own = readModifierControls(document, side)
    const foe = readModifierControls(document, otherSide(side))
    const heroes = heroList(readHeroesFromDom(side))
    const buckets = effectiveBuckets(own, foe, heroWidgetCounts(heroes, side))
    const raw = effective === null ? 0 : rawStat(effective, stat, buckets)
    rawPanels[side][type.id][stat] = raw
    input.dataset['rawValue'] = String(raw)
  }

  function applyGeneration(generation: number): void {
    const preset = getGenerationPreset(generation)
    if (!preset) return

    const heroesBySide: Record<Side, Hero[]> = { left: [], right: [] }
    for (const side of ['left', 'right'] as const) {
      const lineup = getGenerationLineup(preset, side)
      const lineupHeroes: Record<string, Hero | null> = {}
      for (const { id } of TROOP_TYPES) {
        lineupHeroes[id] = getHeroById(lineup.heroes[id])
      }
      const heroes = heroList(lineupHeroes)
      heroesBySide[side] = heroes
      updateWidgetSummary(side, heroes)

      if (lineup.rawStats) {
        setRawPanel(side, panelFromStats(lineup.rawStats))
      } else {
        setRawPanel(
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

    displaySide('left', heroesBySide.left)
    displaySide('right', heroesBySide.right)
  }

  function applyHeroDelta(detail: HeroChangeDetail): void {
    const heroes = heroList(readHeroesFromDom(detail.side))
    updateWidgetSummary(detail.side, heroes)

    if (syncEnabled() && detail.previousId !== detail.heroId) {
      const before = detail.previousId ? HERO_STAT_CONTRIBUTIONS[detail.previousId] : undefined
      const after = detail.heroId ? HERO_STAT_CONTRIBUTIONS[detail.heroId] : undefined
      const attackDefense = (after?.attackDefense ?? 0) - (before?.attackDefense ?? 0)
      const lethalityHealth = (after?.lethalityHealth ?? 0) - (before?.lethalityHealth ?? 0)
      const row = rawPanels[detail.side][detail.type]
      row.attack += attackDefense
      row.defense += attackDefense
      row.lethality += lethalityHealth
      row.health += lethalityHealth
    }

    displaySide(detail.side)
  }

  function applySimulatorLoad(detail: SimulatorLoadDetail): void {
    for (const side of ['left', 'right'] as const) {
      const load = detail[side]
      const heroes = TROOP_TYPES.flatMap(({ id }) => {
        const name = load.heroes[id]
        const hero = name ? getHeroByName(name) : null
        return hero ? [hero] : []
      })
      updateWidgetSummary(side, heroes)

      const buckets = effectiveBuckets(
        emptyBuffs(),
        emptyBuffs(),
        heroWidgetCounts(heroes, side),
      )
      for (const type of TROOP_TYPES) {
        COMBAT_STATS.forEach((stat, index) => {
          const effective = Number(load.stats[type.id][index] ?? 0)
          rawPanels[side][type.id][stat] = rawStat(
            Number.isFinite(effective) ? effective : 0,
            stat,
            buckets,
          )
        })
      }
      displaySide(side, heroes)
    }
  }

  // Seed the raw panel from any pre-filled inputs (currently empty on load).
  for (const side of ['left', 'right'] as const) {
    for (const type of TROOP_TYPES) {
      for (const stat of COMBAT_STATS) {
        const input = statInput(side, type.id, stat)
        rawPanels[side][type.id][stat] = parseStatBonus(input?.value) ?? 0
        if (input) input.dataset['rawValue'] = String(rawPanels[side][type.id][stat])
      }
    }
  }

  onGenerationChange(applyGeneration)
  onHeroChange(applyHeroDelta)
  onSimulatorLoad(applySimulatorLoad)
  onModifierChange(() => displayAll())

  table.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return
    if (!event.target.matches('input[data-stat-side]')) return

    const caret = event.target.selectionStart ?? event.target.value.length
    const edit = sanitizeStatBonusInput(event.target.value, caret)
    if (edit.value !== event.target.value) {
      event.target.value = edit.value
      event.target.setSelectionRange(edit.caret, edit.caret)
    }
    applyManualEdit(event.target)
    resizeInput(event.target)

    const row = event.target.closest<HTMLElement>('[data-stat-row]')
    if (row) updateRow(row)
  })

  table.addEventListener('focusout', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return
    if (!event.target.matches('input[data-stat-side]')) return

    applyManualEdit(event.target)
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
  updateWidgetSummary('left', heroList(readHeroesFromDom('left')))
  updateWidgetSummary('right', heroList(readHeroesFromDom('right')))
}
