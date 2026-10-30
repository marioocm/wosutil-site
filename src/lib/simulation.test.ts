import { describe, expect, it } from 'vitest'
import {
  buildBattleSkillRows,
  buildEngineCase,
  buildSkillRows,
  formatActivations,
  formatBattleCount,
  formatWinRate,
  SIMULATION_SEEDS,
  SKILL_LEVEL,
  validateSimulatorState,
  type SimulatorState,
  type SkillActivation,
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

function activation(overrides: Partial<SkillActivation>): SkillActivation {
  return {
    side: 'att',
    kind: 'hero',
    owner: 'Jeronimo',
    skill: 's1',
    source: 'att|Jeronimo|Jeronimo.s1',
    activations_mean: 0,
    activations_per_round: 0,
    kills_mean: 0,
    ...overrides,
  }
}

function troopActivation(
  owner: string,
  skill: string,
  activations_mean: number,
): SkillActivation {
  return activation({
    kind: 'troop',
    owner,
    skill,
    source: `att|${owner}|${owner}.${skill}`,
    activations_mean,
  })
}

const EMPTY_CLASS_ROWS = [
  { label: '', activations: null },
  { label: '', activations: null },
  { label: '', activations: null },
]

describe('buildSkillRows', () => {
  it('keeps three slots per class and maps reported skill names', () => {
    const rows = buildSkillRows({ infantry: 'Jeronimo', lancer: 'Molly' }, [
      activation({
        owner: 'Jeronimo',
        skill: 'BattleManifesto',
        activations_mean: 12.4,
      }),
      activation({ owner: 'jeronimo', skill: 'Swordmentor', activations_mean: 5 }),
      activation({
        kind: 'troop',
        owner: 'TroopSkills:Infantry',
        skill: 'CrystalShield',
        activations_mean: 100,
      }),
      activation({
        owner: 'Molly',
        skill: 'CallingOfTheStorm',
        activations_mean: 0,
      }),
    ])
    expect(rows).toEqual([
      { label: 'Jeronimo S1', activations: 12.4 },
      { label: 'Jeronimo S2', activations: 5 },
      { label: 'Jeronimo S3', activations: null },
      { label: 'Molly S1', activations: 0 },
      { label: 'Molly S2', activations: null },
      { label: 'Molly S3', activations: null },
      ...EMPTY_CLASS_ROWS,
    ])
  })

  it('keeps missing classes in their three empty slots', () => {
    const rows = buildSkillRows({ lancer: 'Molly' }, [])
    expect(rows).toEqual([
      ...EMPTY_CLASS_ROWS,
      { label: 'Molly S1', activations: null },
      { label: 'Molly S2', activations: null },
      { label: 'Molly S3', activations: null },
      ...EMPTY_CLASS_ROWS,
    ])
  })

  it('uses the slot field when the API provides it', () => {
    const rows = buildSkillRows({ infantry: 'Jeronimo' }, [
      activation({ owner: 'Jeronimo', skill: 'Unknown', slot: 'S3', activations_mean: 7 }),
    ])
    expect(rows[2]).toEqual({ label: 'Jeronimo S3', activations: 7 })
  })

  it('leaves slots without a known skill empty', () => {
    const rows = buildSkillRows({ lancer: 'Jessie' }, [
      activation({ owner: 'Jessie', skill: 'StandOfArms', activations_mean: 4 }),
    ])
    expect(rows.slice(3, 6)).toEqual([
      { label: 'Jessie S1', activations: 4 },
      { label: 'Jessie S2', activations: null },
      { label: '', activations: null },
    ])
  })

  it('leaves S3 empty for heroes without a third skill', () => {
    const rows = buildSkillRows({ infantry: 'Sergey' }, [])
    expect(rows.slice(0, 3)).toEqual([
      { label: 'Sergey S1', activations: null },
      { label: 'Sergey S2', activations: null },
      { label: '', activations: null },
    ])
  })

  it('leaves non-combat placeholder slots empty and keeps the next slot labeled', () => {
    const rows = buildSkillRows({ marksman: 'Zinman' }, [
      activation({ owner: 'Zinman', skill: 'Implacable', activations_mean: 4 }),
      activation({ owner: 'Zinman', skill: 'Bastionist', activations_mean: 1 }),
      activation({ owner: 'Zinman', skill: 'PositionalBattler', activations_mean: 2 }),
    ])
    expect(rows.slice(6, 9)).toEqual([
      { label: 'Zinman S1', activations: 4 },
      { label: '', activations: null },
      { label: 'Zinman S3', activations: 2 },
    ])
  })

  it('falls back to three slots for unknown hero names', () => {
    const rows = buildSkillRows({ marksman: 'Unknown' }, [])
    expect(rows.slice(6, 9)).toEqual([
      { label: 'Unknown S1', activations: null },
      { label: 'Unknown S2', activations: null },
      { label: 'Unknown S3', activations: null },
    ])
  })
})

describe('buildBattleSkillRows', () => {
  it('inserts troop skills below each class and aligns both sides', () => {
    const rows = buildBattleSkillRows(
      {
        heroes: { infantry: 'Sergey', lancer: 'Gordon', marksman: 'Hendrik' },
        skills: [
          troopActivation('TroopSkills:infantry', 'CrystalShield', 10.5),
          troopActivation('TroopSkills:infantry', 'MasterBrawler', 2),
          troopActivation('TroopSkills:lancer', 'Charge', 5),
        ],
      },
      {
        heroes: { infantry: 'Gatot', lancer: 'Sonya', marksman: 'Bradley' },
        skills: [
          troopActivation('TroopSkills:infantry', 'MasterBrawler', 3),
          troopActivation('TroopSkills:infantry', 'CrystalShield', 12),
        ],
      },
    )

    expect(rows.map((row) => `${row.kind}:${row.left.label}:${row.right.label}`)).toEqual([
      'hero:Sergey S1:Gatot S1',
      'hero:Sergey S2:Gatot S2',
      'hero::Gatot S3',
      'troop:Master Brawler:Master Brawler',
      'troop:Crystal Shield:Crystal Shield',
      'hero:Gordon S1:Sonya S1',
      'hero:Gordon S2:Sonya S2',
      'hero:Gordon S3:Sonya S3',
      'troop:Charge:',
      'hero:Hendrik S1:Bradley S1',
      'hero:Hendrik S2:Bradley S2',
      'hero:Hendrik S3:Bradley S3',
    ])
    expect(rows[3]?.left.activations).toBe(2)
    expect(rows[3]?.right.activations).toBe(3)
    expect(rows[4]?.left.activations).toBe(10.5)
    expect(rows[4]?.right.activations).toBe(12)
    expect(rows[8]?.left.activations).toBe(5)
    expect(rows[8]?.right.activations).toBeNull()
  })

  it('keeps a right-only troop skill aligned with an empty left slot', () => {
    const rows = buildBattleSkillRows(
      { heroes: {}, skills: [] },
      {
        heroes: {},
        skills: [troopActivation('TroopSkills:marksman', 'Volley', 7.5)],
      },
    )

    expect(rows[9]).toEqual({
      kind: 'troop',
      left: { label: '', activations: null },
      right: { label: 'Volley', activations: 7.5 },
    })
  })
})

describe('battle result formatting', () => {
  it('formats counts, win rates and missing activations', () => {
    expect(formatBattleCount(1234.6)).toBe('1,235')
    expect(formatBattleCount(-3)).toBe('0')
    expect(formatWinRate(0.556)).toBe('55.6%')
    expect(formatWinRate(2)).toBe('100.0%')
    expect(formatActivations(null)).toBe('–')
    expect(formatActivations(0)).toBe('0.0')
    expect(formatActivations(12.44)).toBe('12.4')
    expect(formatActivations(12.46)).toBe('12.5')
  })
})
