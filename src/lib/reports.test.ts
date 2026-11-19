import { describe, expect, it } from 'vitest'

import {
  buildQuery,
  classLabel,
  formatNumber,
  formatPercent,
  formatSkill,
  generationLabel,
  heroName,
  isRally,
  maxTroopLevel,
  ratioText,
  reportGeneration,
  resultLabel,
  survivorRate,
} from './reports'

describe('reports helpers', () => {
  it('formats hero names with special cases', () => {
    expect(heroName('hank')).toBe('Hank')
    expect(heroName('wu ming')).toBe('Wu Ming')
    expect(heroName('seo-yoon')).toBe('Seo-Yoon')
    expect(heroName(null)).toBe('—')
  })

  it('labels classes and results', () => {
    expect(classLabel('infantry')).toBe('Infantry')
    expect(classLabel('marksman')).toBe('Marksman')
    expect(resultLabel('attacker')).toBe('Attacker victory')
    expect(resultLabel('none')).toBe('No wipe')
  })

  it('formats numbers and percentages', () => {
    expect(formatNumber(12345)).toBe('12,345')
    expect(formatNumber(undefined)).toBe('—')
    expect(formatPercent(0.475)).toBe('47.5%')
    expect(survivorRate(50, 200)).toBe(0.25)
    expect(survivorRate(50, 0)).toBe(0)
    expect(formatSkill('Hank_S1')).toBe('Hank S1')
  })

  it('computes generation from main heroes and joiners', () => {
    const item = {
      heroes: {
        attacker: { infantry: 'Hank', lancer: 'Estrella', marksman: 'Viveca' },
        defender: { infantry: 'Gregory', lancer: 'Dominic', marksman: 'Vulcanus' },
      },
      joiners: { attacker: ['Mia'], defender: [] },
    }
    expect(reportGeneration(item)).toBe(15)
    expect(generationLabel(15)).toBe('Gen 15')
    expect(generationLabel(null)).toBe('Gen —')
    expect(isRally(item)).toBe(true)
    expect(isRally({ ...item, joiners: { attacker: [], defender: [] } })).toBe(false)
  })

  it('reads the maximum troop level', () => {
    expect(maxTroopLevel({ tier_range: [10, 12], fc_range: [5, 10] })).toEqual({ tier: 12, fc: 10 })
    expect(maxTroopLevel({ tier_range: null, fc_range: null })).toEqual({ tier: null, fc: null })
    expect(ratioText({ infantry: 40, lancer: 30, marksman: 30 })).toBe('40% / 30% / 30%')
  })

  it('builds a query without empty filters', () => {
    const query = buildQuery({ hero: ' Hank ', result: 'attacker', has_t12: true }, 120, 24)
    const params = new URLSearchParams(query)
    expect(params.get('hero')).toBe('Hank')
    expect(params.get('result')).toBe('attacker')
    expect(params.get('has_t12')).toBe('true')
    expect(params.get('cursor')).toBe('120')
    expect(params.get('limit')).toBe('24')
    expect(params.get('joiner')).toBeNull()
  })
})
