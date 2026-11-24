import { readFileSync } from 'node:fs'

import { beforeAll, describe, expect, it } from 'vitest'

import init, {
  optimize_ratio,
  simulate,
  version,
} from './pkg/wos_sim_engine.js'

const wasm = new Uint8Array(
  readFileSync(new URL('./pkg/wos_sim_engine_bg.wasm', import.meta.url)),
)

function side() {
  return {
    name: 'test',
    heroes: [],
    joiner_heroes: [],
    troops: {
      infantry: [{ tier: 1, fc: 0, count: 1000 }],
      lancer: [],
      marksman: [],
    },
    stats: {
      inf: [100, 100, 100, 100],
      lanc: [100, 100, 100, 100],
      mark: [100, 100, 100, 100],
    },
    t12: {},
  }
}

const casePayload = { attacker: side(), defender: side() }

beforeAll(async () => {
  await init({ module_or_path: wasm })
})

describe('browser engine', () => {
  it('loads the wasm bundle and reports its version', () => {
    expect(version()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('runs a simulate request through the same Rust API', () => {
    const result = JSON.parse(
      simulate(
        JSON.stringify({ case: casePayload, seeds: 8, seed_base: 'test' }),
      ),
    ) as {
      seeds: number
      initial: { att: number; def: number }
      att: { initial: number[] }
      skills: { att: unknown[]; def: unknown[] }
    }
    expect(result.seeds).toBe(8)
    expect(result.initial.att).toBe(1000)
    expect(result.initial.def).toBe(1000)
    expect(result.att.initial).toEqual([1000, 0, 0])
    expect(result.skills.att).toEqual([])
  })

  it('runs a ratio request through the same Rust API', () => {
    const request = JSON.stringify({
      case: casePayload,
      side: 'att',
      seeds: 8,
      seed_base: 'test',
      step: 50,
      top: 3,
    })
    const first = JSON.parse(optimize_ratio(request)) as {
      evaluated: number
      results: Array<{ ratio_text: string }>
      best: { ratio_text: string }
    }
    const second = JSON.parse(optimize_ratio(request)) as typeof first
    expect(first.evaluated).toBeGreaterThan(0)
    expect(first.results.length).toBeGreaterThan(0)
    expect(first.best.ratio_text).toMatch(/^\d+:\d+:\d+$/)
    expect(second.best.ratio_text).toBe(first.best.ratio_text)
  })
})
