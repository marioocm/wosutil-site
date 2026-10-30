import { describe, expect, it } from 'vitest'
import {
  buildEngineCase,
  formatSimulationResult,
  SIMULATION_SEEDS,
  SKILL_LEVEL,
  validateSimulatorState,
  type SimulatorState,
} from './simulation'

function state(overrides: Partial<SimulatorState> = {}): SimulatorState {
  return {
    left: {
      heroes: { infantry: 'Ahmose', lancer: 'Reina', marksman: 'Lynn' },
      joiners: ['Jessie', null, null, null],
      troops: {
        infantry: { tier: 12, fc: 10, count: 1000, t12: 24 },
        lancer: { tier: 11, fc: 8, count: 2000, t12: 7 },
        marksman: { tier: 10, fc: 0, count: 3000, t12: 0 },
      },
      stats: {
        'infantry-attack': 100,
        'infantry-defense': 12.5,
        'infantry-lethality': -500,
        'lancer-health': 4.25,
      },
    },
    right: {
      heroes: {},
      joiners: [],
      troops: {
        infantry: { tier: 12, fc: 10, count: 500, t12: 5 },
        lancer: { tier: 12, fc: 10, count: 0, t12: 5 },
        marksman: { tier: 12, fc: 10, count: 0, t12: 5 },
      },
      stats: {},
    },
    ...overrides,
  }
}

describe('buildEngineCase', () => {
  it('carries heroes, joiners, troops, stats and skill levels', () => {
    const engine = buildEngineCase(state())
    expect(engine.attacker.name).toBe('Left')
    expect(engine.attacker.heroes).toEqual([
      { name: 'Ahmose', s1: SKILL_LEVEL, s2: SKILL_LEVEL, s3: SKILL_LEVEL },
      { name: 'Reina', s1: SKILL_LEVEL, s2: SKILL_LEVEL, s3: SKILL_LEVEL },
      { name: 'Lynn', s1: SKILL_LEVEL, s2: SKILL_LEVEL, s3: SKILL_LEVEL },
    ])
    expect(engine.attacker.joiner_heroes).toEqual([{ name: 'Jessie', s1: SKILL_LEVEL }])
    expect(engine.attacker.troops).toEqual({
      infantry: { tier: 12, fc: 10, count: 1000 },
      lancer: { tier: 11, fc: 8, count: 2000 },
      marksman: { tier: 10, fc: 0, count: 3000 },
    })
    expect(engine.attacker.stats).toEqual({
      inf: [100, 12.5, -100, 0],
      lanc: [0, 0, 0, 4.25],
      mark: [0, 0, 0, 0],
    })
    expect(engine.attacker.t12).toEqual({
      infantry: 24,
      lancer: 7,
      marksman: 0,
    })
    expect(engine.defender.troops).toEqual({
      infantry: { tier: 12, fc: 10, count: 500 },
    })
  })

  it('omits empty troop classes and empty joiner slots', () => {
    const engine = buildEngineCase(state())
    expect(engine.defender.heroes).toEqual([])
    expect(engine.defender.joiner_heroes).toEqual([])
    expect(engine.defender.troops.lancer).toBeUndefined()
    expect(engine.defender.troops.marksman).toBeUndefined()
  })

  it('uses the API seed count', () => {
    expect(SIMULATION_SEEDS).toBe(256)
  })
})

describe('validateSimulatorState', () => {
  it('requires troops on both sides', () => {
    expect(validateSimulatorState(state())).toBeNull()
    expect(
      validateSimulatorState(
        state({
          right: {
            ...state().right,
            troops: {
              infantry: { tier: 12, fc: 10, count: 0, t12: 5 },
              lancer: { tier: 12, fc: 10, count: 0, t12: 5 },
              marksman: { tier: 12, fc: 10, count: 0, t12: 5 },
            },
          },
        }),
      ),
    ).toBe('Enter troop counts for both sides before simulating.')
  })
})

describe('formatSimulationResult', () => {
  it('renders the distribution summary', () => {
    const text = formatSimulationResult({
      api_version: '1',
      engine_version: '0.1.0',
      elapsed_ms: 67.3,
      seeds: 256,
      threads: 8,
      initial: { att: 6000, def: 500 },
      att: {
        survivors_mean: [93.2, 0, 0],
        survivors_p10: [0, 0, 0],
        survivors_p50: [93.2, 0, 0],
        survivors_p90: [93.2, 0, 0],
        total_mean: 93.2,
        rate_mean: 0.3727,
        wipe_rate: 0,
      },
      def: {
        survivors_mean: [0, 0, 0],
        survivors_p10: [0, 0, 0],
        survivors_p50: [0, 0, 0],
        survivors_p90: [0, 0, 0],
        total_mean: 0,
        rate_mean: 0,
        wipe_rate: 1,
      },
      margin: { mean: 0.3727, p10: 0.3516, p50: 0.3722, p90: 0.3944 },
      att_win_rate: 1,
      rounds: { mean: 330.6, min: 322, max: 338, p50: 331 },
      warnings: ['Unknown hero ignored by the engine: Gina'],
    })
    expect(text).toContain('Engine 0.1.0')
    expect(text).toContain('256 seeds')
    expect(text).toContain('INF 93.2 / LAN 0.0 / MAR 0.0')
    expect(text).toContain('Margin +0.3727')
    expect(text).toContain('ATT win 100.0%')
    expect(text).toContain('Warnings: Unknown hero ignored by the engine: Gina')
  })
})
