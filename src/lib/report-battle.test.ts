import { describe, expect, it } from 'vitest'

import { buildSimulatorBattle } from './report-battle'
import type { ReportDetail, SideDetail, Troop } from './reports'

function troop(overrides: Partial<Troop>): Troop {
  return {
    class: 'infantry',
    tier: 12,
    furnace: 'FC10',
    count: 0,
    kills: 0,
    losses: 0,
    injured: 0,
    lightly_injured: 0,
    survivors: 0,
    ...overrides,
  }
}

function side(overrides: Partial<SideDetail> = {}): SideDetail {
  return {
    totals: { troops: 0, losses: 0, injured: 0, lightly_injured: 0, survivors: 0 },
    heroes: { infantry: 'Hank', lancer: 'Estrella', marksman: 'Viveca' },
    joiners: [],
    t12_skills: { infantry: 20, lancer: 4, marksman: 0 },
    stat_bonuses: {
      infantry: { attack: 4000.1, defense: 3000.2, lethality: 2500.3, health: 5000.4 },
      lancer: { attack: 4100.5, defense: 3100.6, lethality: 2600.7, health: 5100.8 },
      marksman: { attack: 4200.9, defense: 3200.1, lethality: 2700.2, health: 5200.3 },
    },
    troops: [],
    skill_details: [],
    ...overrides,
  }
}

function report(attacker: SideDetail, defender: SideDetail): ReportDetail {
  return {
    id: '0123456789abcdef',
    schema_version: 1,
    result: 'attacker',
    attacker,
    defender,
    ratio: {
      attacker: { infantry: 40, lancer: 30, marksman: 30 },
      defender: { infantry: 40, lancer: 30, marksman: 30 },
    },
  }
}

describe('buildSimulatorBattle', () => {
  it('maps heroes, joiners, stats and t12 levels', () => {
    const attacker = side({
      heroes: { infantry: 'wu ming', lancer: 'Seo-Yoon', marksman: 'unknown hero' },
      joiners: ['Mia', 'Jeronimo', 'Jessie', 'Bahiti', 'Molly'],
    })
    const battle = buildSimulatorBattle(report(attacker, side()))

    expect(battle.reportId).toBe('0123456789abcdef')
    expect(battle.left.heroes).toEqual({
      infantry: 'Wu Ming',
      lancer: 'Seo-yoon',
      marksman: null,
    })
    expect(battle.left.joiners).toEqual(['Mia', 'Jeronimo', 'Jessie', 'Bahiti'])
    expect(battle.left.stats.infantry).toEqual([4000.1, 3000.2, 2500.3, 5000.4])
    expect(battle.left.stats.lancer).toEqual([4100.5, 3100.6, 2600.7, 5100.8])
    expect(battle.left.stats.marksman).toEqual([4200.9, 3200.1, 2700.2, 5200.3])
    expect(battle.left.troops.infantry.t12).toBe(20)
  })

  it('keeps every mixed troop group, largest first', () => {
    const attacker = side({
      troops: [
        troop({ class: 'infantry', tier: 12, furnace: 'FC10', count: 100 }),
        troop({ class: 'infantry', tier: 11, furnace: 'FC9', count: 900 }),
        troop({ class: 'infantry', tier: 10, furnace: 'FC7', count: 200 }),
        troop({ class: 'lancer', tier: 12, furnace: 'FC8', count: 400 }),
        troop({ class: 'marksman', tier: 11, furnace: '', count: 50 }),
      ],
    })
    const battle = buildSimulatorBattle(report(attacker, side()))

    expect(battle.left.troops.infantry).toEqual({
      groups: [
        { tier: 11, fc: 9, count: 900 },
        { tier: 10, fc: 7, count: 200 },
        { tier: 12, fc: 10, count: 100 },
      ],
      t12: 20,
    })
    expect(battle.left.troops.lancer).toEqual({
      groups: [{ tier: 12, fc: 8, count: 400 }],
      t12: 4,
    })
    expect(battle.left.troops.marksman).toEqual({
      groups: [{ tier: 11, fc: 0, count: 50 }],
      t12: 0,
    })
  })

  it('falls back to the default tier and FC for empty classes', () => {
    const battle = buildSimulatorBattle(report(side(), side()))

    expect(battle.left.troops.infantry).toEqual({
      groups: [{ tier: 12, fc: 10, count: 0 }],
      t12: 20,
    })
  })
})
