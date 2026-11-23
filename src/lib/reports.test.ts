import { describe, expect, it } from 'vitest'

import {
  averageTroopLevel,
  buildQuery,
  classLabel,
  filterQuery,
  formatNumber,
  formatPercent,
  formatSkill,
  generationFilterLabel,
  generationLabel,
  heroFilterLabel,
  heroName,
  isNoHeroesFilter,
  isRally,
  isReportMode,
  maxTroopLevel,
  normalizeHeroFilters,
  parseGeneration,
  parseLevelBound,
  parseReportFilterEntry,
  parseSurvivors,
  ratioText,
  reportFilterEntryValue,
  reportFilterSideLabel,
  reportGeneration,
  reportModeLabel,
  resultLabel,
  simulatorBattlePath,
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
    expect(generationFilterLabel(10)).toBe('Gen 10 or older')
    expect(generationFilterLabel(undefined)).toBe('All gens')
    expect(parseGeneration('10')).toBe(10)
    expect(parseGeneration('')).toBeNull()
    expect(parseGeneration('0')).toBeNull()
    expect(parseGeneration('ten')).toBeNull()
    expect(isRally(item)).toBe(true)
    expect(isRally({ ...item, joiners: { attacker: [], defender: [] } })).toBe(false)
  })

  it('reads the maximum troop level', () => {
    expect(maxTroopLevel({ tier_range: [10, 12], fc_range: [5, 10] })).toEqual({ tier: 12, fc: 10 })
    expect(maxTroopLevel({ tier_range: null, fc_range: null })).toEqual({ tier: null, fc: null })
    expect(ratioText({ infantry: 40, lancer: 30, marksman: 30 })).toBe('40% / 30% / 30%')
  })

  it('averages troop tier and FC with the game truncation', () => {
    expect(
      averageTroopLevel([
        { tier: 12, furnace: 'FC10', count: 896 },
        { tier: 11, furnace: 'FC10', count: 34_237 },
        { tier: 10, furnace: 'FC10', count: 1_216 },
      ]),
    ).toEqual({ tier: 10.9, fc: 10, maxTier: 12, count: 36_349 })

    expect(
      averageTroopLevel([
        { tier: 12, furnace: 'FC10', count: 48_920 },
        { tier: 11, furnace: 'FC10', count: 39_558 },
        { tier: 11, furnace: 'FC8', count: 35_521 },
      ]),
    ).toEqual({ tier: 11.3, fc: 9, maxTier: 12, count: 123_999 })

    expect(
      averageTroopLevel([
        { tier: 12, furnace: 'FC10', count: 100_697 },
        { tier: 11, furnace: 'FC10', count: 80_974 },
        { tier: 11, furnace: 'FC8', count: 163_710 },
        { tier: 10, furnace: 'FC6', count: 39_237 },
      ]),
    ).toEqual({ tier: 11.1, fc: 8, maxTier: 12, count: 384_618 })

    expect(averageTroopLevel([{ tier: 10, furnace: '', count: 170_000 }])).toEqual({
      tier: 10,
      fc: 0,
      maxTier: 10,
      count: 170_000,
    })
    expect(averageTroopLevel([])).toEqual({ tier: null, fc: null, maxTier: null, count: 0 })
  })

  it('builds a query with repeated hero and joiner filters', () => {
    const query = buildQuery(
      {
        heroes: [
          { name: 'hank', side: 'attacker' },
          { name: 'edith', side: 'any' },
        ],
        joiners: [{ name: 'mia', side: 'defender' }],
        mode: 'rally',
        result: 'attacker',
        tier_min: 11,
        tier_max: 12,
        fc_min: 0,
        fc_max: 10,
        max_gen: 10,
        max_survivors: 25,
        has_t12: true,
      },
      120,
      24,
    )
    const params = new URLSearchParams(query)
    expect(params.getAll('hero')).toEqual(['hank:attacker', 'edith'])
    expect(params.getAll('joiner')).toEqual(['mia:defender'])
    expect(params.get('mode')).toBe('rally')
    expect(params.get('result')).toBe('attacker')
    expect(params.get('tier_min')).toBe('11')
    expect(params.get('tier_max')).toBe('12')
    expect(params.get('fc_min')).toBe('0')
    expect(params.get('fc_max')).toBe('10')
    expect(params.get('max_gen')).toBe('10')
    expect(params.get('max_survivors')).toBe('25')
    expect(params.get('has_t12')).toBe('true')
    expect(params.get('cursor')).toBe('120')
    expect(params.get('limit')).toBe('24')
  })

  it('parses optional tier and FC bounds', () => {
    expect(parseLevelBound('12', 1, 12)).toBe(12)
    expect(parseLevelBound('0', 0, 10)).toBe(0)
    expect(parseLevelBound('', 1, 12)).toBeNull()
    expect(parseLevelBound('13', 1, 12)).toBeNull()
    expect(parseLevelBound('-1', 0, 10)).toBeNull()
    expect(parseLevelBound('3.5', 1, 12)).toBeNull()
    expect(parseLevelBound('abc', 1, 12)).toBeNull()
  })

  it('parses the survivors cap percentage', () => {
    expect(parseSurvivors('50')).toBe(50)
    expect(parseSurvivors('25')).toBe(25)
    expect(parseSurvivors('10')).toBe(10)
    expect(parseSurvivors('')).toBeNull()
    expect(parseSurvivors('0')).toBeNull()
    expect(parseSurvivors('30')).toBeNull()
    expect(parseSurvivors('100')).toBeNull()
    expect(parseSurvivors('12.5')).toBeNull()
    expect(parseSurvivors('abc')).toBeNull()
  })

  it('parses and serializes hero side filters', () => {
    expect(parseReportFilterEntry('Hank')).toEqual({ name: 'hank', side: 'any' })
    expect(parseReportFilterEntry(' hank:ATTACKER ')).toEqual({
      name: 'hank',
      side: 'attacker',
    })
    expect(parseReportFilterEntry('seo-yoon:defender')).toEqual({
      name: 'seo-yoon',
      side: 'defender',
    })
    expect(parseReportFilterEntry('hank:both')).toEqual({
      name: 'hank',
      side: 'both',
    })
    expect(parseReportFilterEntry('hank:unknown')).toEqual({
      name: 'hank:unknown',
      side: 'any',
    })
    expect(parseReportFilterEntry('  ')).toBeNull()
    expect(reportFilterEntryValue({ name: 'hank', side: 'any' })).toBe('hank')
    expect(reportFilterEntryValue({ name: 'hank', side: 'defender' })).toBe(
      'hank:defender',
    )
    expect(reportFilterEntryValue({ name: 'hank', side: 'both' })).toBe('hank:both')
    expect(reportFilterSideLabel('any')).toBe('Any')
    expect(reportFilterSideLabel('attacker')).toBe('Attacker')
    expect(reportFilterSideLabel('defender')).toBe('Defender')
    expect(reportFilterSideLabel('both')).toBe('Both')
    expect(isReportMode('rally')).toBe(true)
    expect(isReportMode('1v1')).toBe(true)
    expect(isReportMode('any')).toBe(false)
    expect(reportModeLabel('rally')).toBe('Rally')
    expect(reportModeLabel('1v1')).toBe('1v1')
  })

  it('builds the simulator battle link', () => {
    expect(simulatorBattlePath('68b10c6c6f8d30a0')).toMatch(
      /\/simulator\/\?battle=68b10c6c6f8d30a0$/,
    )
  })

  it('keeps filterQuery free of pagination parameters', () => {
    const params = filterQuery({ heroes: [{ name: 'hank', side: 'any' }] })
    expect(params.toString()).toBe('hero=hank')
  })

  it('models the exclusive no-heroes hero filter', () => {
    const none = { name: 'none', side: 'any' as const }
    expect(isNoHeroesFilter(none)).toBe(true)
    expect(isNoHeroesFilter({ name: 'hank', side: 'any' })).toBe(false)
    expect(heroFilterLabel(none)).toBe('No heroes')
    expect(heroFilterLabel({ name: 'hank', side: 'any' })).toBe('Hank')
    expect(
      normalizeHeroFilters([
        { name: 'hank', side: 'any' },
        { name: 'none', side: 'attacker' },
        { name: 'edith', side: 'defender' },
      ]),
    ).toEqual([none])
    expect(normalizeHeroFilters([{ name: 'hank', side: 'attacker' }])).toEqual([
      { name: 'hank', side: 'attacker' },
    ])
    expect(filterQuery({ heroes: [none] }).getAll('hero')).toEqual(['none'])
  })
})
