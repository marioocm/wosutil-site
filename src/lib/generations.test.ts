import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getGenerationPreset,
  getGenerationPresets,
  loadGenerationPresets,
  parseGenerationPresets,
  type GenerationPreset,
} from './generations'

function preset(generation: number): GenerationPreset {
  return {
    generation,
    tier: 12,
    fc: 10,
    baseStat: 900,
    totalTroops: 1_800_000,
    attack: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'vulcanus' },
      ratio: [51, 49, 0],
    },
    defense: {
      heroes: { infantry: 'hank', lancer: 'estrella', marksman: 'cara' },
      ratio: [43, 13, 44],
    },
  }
}

function payload(generations: unknown[]): unknown {
  return { generations }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseGenerationPresets', () => {
  it('sorts the API presets by generation', () => {
    const parsed = parseGenerationPresets(payload([preset(2), preset(1)]))
    expect(parsed.map((item) => item.generation)).toEqual([1, 2])
  })

  it('rejects ratios that do not add up to 100', () => {
    const base = preset(1)
    const invalid: GenerationPreset = {
      ...base,
      attack: { ...base.attack, ratio: [50, 49, 0] },
    }
    expect(() => parseGenerationPresets(payload([invalid]))).toThrow(TypeError)
  })

  it('rejects duplicate generations', () => {
    expect(() => parseGenerationPresets(payload([preset(1), preset(1)]))).toThrow(TypeError)
  })

  it('rejects an empty response', () => {
    expect(() => parseGenerationPresets(payload([]))).toThrow(TypeError)
  })
})

describe('loadGenerationPresets', () => {
  it('fetches the presets and exposes them to the widgets', async () => {
    const body = payload([preset(1), preset(2)])
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const loaded = await loadGenerationPresets('http://localhost:8000')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/v1/presets',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
    expect(loaded).toHaveLength(2)
    expect(getGenerationPresets()).toHaveLength(2)
    expect(getGenerationPreset(2)?.tier).toBe(12)
  })

  it('surfaces an API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('missing', { status: 503 })),
    )
    await expect(loadGenerationPresets('http://localhost:8000')).rejects.toThrow(
      'Preset API error 503',
    )
  })
})
