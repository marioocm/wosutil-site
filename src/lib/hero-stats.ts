import type { Hero, TroopType } from './heroes'

export type CombatStat = 'attack' | 'defense' | 'lethality' | 'health'

export type WidgetSide = 'att' | 'def'

export interface HeroStatContribution {
  attackDefense: number
  lethalityHealth: number
  widgetStat: CombatStat
  widgetSide: WidgetSide
}

export type SideStatPanel = Record<TroopType, Record<CombatStat, number>>

export const WIDGET_BONUS = 0.15

export const COMBAT_STATS: readonly CombatStat[] = [
  'attack',
  'defense',
  'lethality',
  'health',
]

export const HERO_STAT_CONTRIBUTIONS: Readonly<Record<string, HeroStatContribution>> = {
  natalia: { attackDefense: 200.16, lethalityHealth: 55, widgetStat: 'lethality', widgetSide: 'att' },
  jeronimo: { attackDefense: 260.21, lethalityHealth: 62.5, widgetStat: 'attack', widgetSide: 'att' },
  molly: { attackDefense: 200.16, lethalityHealth: 50, widgetStat: 'lethality', widgetSide: 'def' },
  zinman: { attackDefense: 200.16, lethalityHealth: 50, widgetStat: 'attack', widgetSide: 'def' },
  flint: { attackDefense: 240.19, lethalityHealth: 60, widgetStat: 'attack', widgetSide: 'def' },
  philly: { attackDefense: 240.19, lethalityHealth: 60, widgetStat: 'health', widgetSide: 'def' },
  alonso: { attackDefense: 240.19, lethalityHealth: 60, widgetStat: 'lethality', widgetSide: 'att' },
  logan: { attackDefense: 290.23, lethalityHealth: 70, widgetStat: 'defense', widgetSide: 'def' },
  mia: { attackDefense: 290.23, lethalityHealth: 70, widgetStat: 'attack', widgetSide: 'att' },
  greg: { attackDefense: 290.23, lethalityHealth: 70, widgetStat: 'health', widgetSide: 'att' },
  ahmose: { attackDefense: 370.3, lethalityHealth: 92.5, widgetStat: 'health', widgetSide: 'def' },
  reina: { attackDefense: 370.3, lethalityHealth: 92.5, widgetStat: 'lethality', widgetSide: 'att' },
  lynn: { attackDefense: 370.3, lethalityHealth: 92.5, widgetStat: 'lethality', widgetSide: 'def' },
  hector: { attackDefense: 444.36, lethalityHealth: 111, widgetStat: 'attack', widgetSide: 'def' },
  norah: { attackDefense: 444.36, lethalityHealth: 111, widgetStat: 'defense', widgetSide: 'def' },
  gwen: { attackDefense: 444.36, lethalityHealth: 111, widgetStat: 'lethality', widgetSide: 'att' },
  'wu-ming': { attackDefense: 540.43, lethalityHealth: 133.5, widgetStat: 'defense', widgetSide: 'def' },
  renee: { attackDefense: 540.43, lethalityHealth: 133.5, widgetStat: 'lethality', widgetSide: 'att' },
  wayne: { attackDefense: 540.43, lethalityHealth: 133.5, widgetStat: 'lethality', widgetSide: 'def' },
  edith: { attackDefense: 650.52, lethalityHealth: 160.5, widgetStat: 'health', widgetSide: 'def' },
  gordon: { attackDefense: 650.52, lethalityHealth: 160.5, widgetStat: 'lethality', widgetSide: 'att' },
  bradley: { attackDefense: 650.52, lethalityHealth: 160.5, widgetStat: 'attack', widgetSide: 'def' },
  gatot: { attackDefense: 780.62, lethalityHealth: 193, widgetStat: 'defense', widgetSide: 'def' },
  sonya: { attackDefense: 780.62, lethalityHealth: 193, widgetStat: 'lethality', widgetSide: 'def' },
  hendrik: { attackDefense: 780.62, lethalityHealth: 193, widgetStat: 'attack', widgetSide: 'att' },
  magnus: { attackDefense: 940.75, lethalityHealth: 232, widgetStat: 'health', widgetSide: 'def' },
  fred: { attackDefense: 940.75, lethalityHealth: 232, widgetStat: 'attack', widgetSide: 'att' },
  xura: { attackDefense: 940.75, lethalityHealth: 232, widgetStat: 'attack', widgetSide: 'def' },
  gregory: { attackDefense: 1110.89, lethalityHealth: 278.5, widgetStat: 'lethality', widgetSide: 'def' },
  freya: { attackDefense: 1110.89, lethalityHealth: 278.5, widgetStat: 'defense', widgetSide: 'def' },
  blanchette: { attackDefense: 1110.89, lethalityHealth: 278.5, widgetStat: 'lethality', widgetSide: 'att' },
  eleonora: { attackDefense: 1281.02, lethalityHealth: 334.5, widgetStat: 'health', widgetSide: 'def' },
  lloyd: { attackDefense: 1281.02, lethalityHealth: 334.5, widgetStat: 'attack', widgetSide: 'def' },
  rufus: { attackDefense: 1281.02, lethalityHealth: 334.5, widgetStat: 'attack', widgetSide: 'att' },
  hervor: { attackDefense: 1451.16, lethalityHealth: 401.5, widgetStat: 'defense', widgetSide: 'def' },
  karol: { attackDefense: 1451.16, lethalityHealth: 401.5, widgetStat: 'attack', widgetSide: 'att' },
  ligeia: { attackDefense: 1451.16, lethalityHealth: 401.5, widgetStat: 'lethality', widgetSide: 'def' },
  gisela: { attackDefense: 1621.3, lethalityHealth: 482, widgetStat: 'attack', widgetSide: 'def' },
  flora: { attackDefense: 1621.3, lethalityHealth: 482, widgetStat: 'health', widgetSide: 'def' },
  vulcanus: { attackDefense: 1621.3, lethalityHealth: 482, widgetStat: 'attack', widgetSide: 'att' },
  elif: { attackDefense: 1791.43, lethalityHealth: 578.5, widgetStat: 'defense', widgetSide: 'def' },
  dominic: { attackDefense: 1791.43, lethalityHealth: 578.5, widgetStat: 'lethality', widgetSide: 'att' },
  cara: { attackDefense: 1791.43, lethalityHealth: 578.5, widgetStat: 'lethality', widgetSide: 'def' },
  hank: { attackDefense: 1961.57, lethalityHealth: 694, widgetStat: 'health', widgetSide: 'def' },
  estrella: { attackDefense: 1961.57, lethalityHealth: 694, widgetStat: 'attack', widgetSide: 'def' },
  viveca: { attackDefense: 1961.57, lethalityHealth: 694, widgetStat: 'lethality', widgetSide: 'att' },
  seigel: { attackDefense: 2131.7, lethalityHealth: 833, widgetStat: 'lethality', widgetSide: 'def' },
  ursar: { attackDefense: 2131.7, lethalityHealth: 833, widgetStat: 'attack', widgetSide: 'att' },
  aisling: { attackDefense: 2131.7, lethalityHealth: 833, widgetStat: 'defense', widgetSide: 'def' },
  aiden: { attackDefense: 2301.84, lethalityHealth: 999.5, widgetStat: 'attack', widgetSide: 'def' },
  bertha: { attackDefense: 2301.84, lethalityHealth: 999.5, widgetStat: 'lethality', widgetSide: 'def' },
  eleanor: { attackDefense: 2301.84, lethalityHealth: 999.5, widgetStat: 'lethality', widgetSide: 'att' },
}

function emptyPanel(base: number): SideStatPanel {
  return {
    infantry: { attack: base, defense: base, lethality: base, health: base },
    lancer: { attack: base, defense: base, lethality: base, health: base },
    marksman: { attack: base, defense: base, lethality: base, health: base },
  }
}

export function composeSideStats(
  base: number,
  heroes: readonly Hero[],
  side: 'left' | 'right',
): SideStatPanel {
  const panel = emptyPanel(base)
  const widgetSide: WidgetSide = side === 'left' ? 'att' : 'def'
  const widgets: Record<CombatStat, number> = {
    attack: 0,
    defense: 0,
    lethality: 0,
    health: 0,
  }

  for (const hero of heroes) {
    const contribution = HERO_STAT_CONTRIBUTIONS[hero.id]
    if (!contribution) continue

    const row = panel[hero.type]
    row.attack += contribution.attackDefense
    row.defense += contribution.attackDefense
    row.lethality += contribution.lethalityHealth
    row.health += contribution.lethalityHealth

    if (contribution.widgetSide === widgetSide) {
      widgets[contribution.widgetStat] += 1
    }
  }

  for (const stat of COMBAT_STATS) {
    const count = widgets[stat]
    if (count === 0) continue
    const factor = 1 + WIDGET_BONUS * count
    for (const type of ['infantry', 'lancer', 'marksman'] as const) {
      panel[type][stat] *= factor
    }
  }

  return panel
}
