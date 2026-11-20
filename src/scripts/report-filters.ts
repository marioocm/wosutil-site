import {
  bindPickerKeyboard,
  createClearOption,
  createHeroOption,
} from '../components/hero-option'
import { fillHeroVisual } from '../components/hero-visual'
import {
  HEROES,
  getHeroByName,
  isHeroAvailable,
  type Hero,
} from '../lib/heroes'
import {
  generationFilterLabel,
  heroName,
  parseGeneration,
  type ReportFilters,
  type ReportMeta,
} from '../lib/reports'

type PickerKind = 'hero' | 'joiner'

interface HeroChoice {
  /** Archive name sent to the API (lower case). */
  value: string
  /** Roster data used for the portrait and the generation label. */
  hero: Hero
}

export interface ReportFiltersController {
  readonly filters: ReportFilters
  setMeta(meta: ReportMeta): void
}

const GENERATION_COLUMNS = 3
const GENERATION_OPTION_CLASS =
  'flex min-h-[3.5rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm border border-line bg-background px-2 py-2 text-center transition-colors hover:border-line-strong hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
const GENERATION_ALL_CLASS = `${GENERATION_OPTION_CLASS} col-span-3 min-h-[3rem]`
const GENERATION_LABEL_CLASS =
  'font-primary text-p2 font-medium leading-none tabular-nums'
const GENERATION_META_CLASS = 'font-mono text-[10px] leading-none text-ink-muted'

function must<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Missing report filters element: ${selector}`)
  return element
}

function choiceFor(name: string): HeroChoice {
  const value = name.trim().toLowerCase()
  const known = getHeroByName(value)
  return {
    value,
    hero: known
      ? { ...known, name: heroName(value) }
      : { id: value, name: heroName(value), type: 'infantry', generation: null },
  }
}

function buildChoices(names: string[]): HeroChoice[] {
  const seen = new Set<string>()
  const choices: HeroChoice[] = []
  for (const name of names) {
    const choice = choiceFor(name)
    if (!choice.value || seen.has(choice.value)) continue
    seen.add(choice.value)
    choices.push(choice)
  }
  return choices.sort(
    (left, right) =>
      (right.hero.generation ?? 0) - (left.hero.generation ?? 0) ||
      left.hero.name.localeCompare(right.hero.name),
  )
}

function maxHeroGeneration(): number {
  return HEROES.reduce((max, hero) => Math.max(max, hero.generation ?? 0), 1)
}

function initialFilters(): ReportFilters {
  const params = new URLSearchParams(window.location.search)
  return {
    hero: params.get('hero') || '',
    joiner: params.get('joiner') || '',
    result: params.get('result') || '',
    tier: params.get('tier') || '',
    fc: params.get('fc') || '',
    max_gen: parseGeneration(params.get('max_gen')) ?? undefined,
    has_t12: params.get('has_t12') === 'true',
  }
}

export function initReportFilters(
  onChange: (filters: ReportFilters) => void,
): ReportFiltersController {
  const root = document.querySelector<HTMLElement>('[data-reports]')
  if (!root) throw new Error('Missing reports root')

  const form = must<HTMLFormElement>(root, '[data-report-filters]')
  const generationTrigger = must<HTMLButtonElement>(root, '[data-report-generation-trigger]')
  const generationValue = must<HTMLElement>(root, '[data-report-generation-value]')
  const generationDialog = must<HTMLDialogElement>(root, '#report-generation-picker')
  const generationOptions = must<HTMLElement>(root, '[data-report-generation-options]')
  const generationClose = must<HTMLButtonElement>(root, '[data-report-generation-close]')

  const pickerTriggers = [
    ...root.querySelectorAll<HTMLButtonElement>('[data-report-picker-trigger]'),
  ]
  const heroVisual = must<HTMLElement>(root, '[data-report-hero-visual]')
  const heroValue = must<HTMLElement>(root, '[data-report-hero-value]')
  const joinerVisual = must<HTMLElement>(root, '[data-report-joiner-visual]')
  const joinerValue = must<HTMLElement>(root, '[data-report-joiner-value]')
  const pickerDialog = must<HTMLDialogElement>(root, '#report-picker')
  const pickerTitle = must<HTMLElement>(root, '#report-picker-title')
  const pickerSubtitle = must<HTMLElement>(root, '[data-report-picker-subtitle]')
  const pickerSearch = must<HTMLInputElement>(root, '[data-report-picker-search]')
  const pickerOptions = must<HTMLElement>(root, '[data-report-picker-options]')
  const pickerClose = must<HTMLButtonElement>(root, '[data-report-picker-close]')

  let filters = initialFilters()
  let heroChoices: HeroChoice[] = []
  let joinerChoices: HeroChoice[] = []
  let mode: PickerKind = 'hero'
  let activeTrigger: HTMLButtonElement | null = null

  function currentChoices(): HeroChoice[] {
    return mode === 'hero' ? heroChoices : joinerChoices
  }

  function currentValue(): string {
    return (mode === 'hero' ? filters.hero : filters.joiner) ?? ''
  }

  function syncForm(): void {
    for (const key of ['result', 'tier', 'fc'] as const) {
      const field = form.elements.namedItem(key)
      if (field instanceof HTMLSelectElement) field.value = filters[key] ?? ''
    }
    const t12 = form.elements.namedItem('has_t12')
    if (t12 instanceof HTMLInputElement) t12.checked = Boolean(filters.has_t12)
  }

  function notify(): void {
    onChange({ ...filters })
  }

  function renderGeneration(): void {
    generationValue.textContent = generationFilterLabel(filters.max_gen)
    generationTrigger.dataset['selected'] = filters.max_gen ? 'true' : 'false'
    generationTrigger.setAttribute(
      'aria-label',
      `Filter by generation: ${generationFilterLabel(filters.max_gen)}`,
    )
    for (const option of generationOptions.querySelectorAll<HTMLButtonElement>(
      '[data-report-generation-option]',
    )) {
      const value = option.dataset['reportGenerationOption']
      const selected =
        value === 'all' ? !filters.max_gen : Number(value) === filters.max_gen
      option.dataset['selected'] = selected ? 'true' : 'false'
      option.setAttribute('aria-pressed', selected ? 'true' : 'false')
    }
  }

  function renderPickerTrigger(kind: PickerKind): void {
    const value = (kind === 'hero' ? filters.hero : filters.joiner) ?? ''
    const visual = kind === 'hero' ? heroVisual : joinerVisual
    const text = kind === 'hero' ? heroValue : joinerValue
    const trigger = pickerTriggers.find(
      (item) => item.dataset['reportPickerTrigger'] === kind,
    )
    fillHeroVisual(visual, value ? choiceFor(value).hero : null)
    text.textContent = value ? heroName(value) : kind === 'hero' ? 'Any hero' : 'Any joiner'
    if (trigger) {
      trigger.dataset['selected'] = value ? 'true' : 'false'
      trigger.setAttribute(
        'aria-label',
        `Filter by ${kind}: ${value ? heroName(value) : `Any ${kind}`}`,
      )
    }
  }

  function renderTriggers(): void {
    renderGeneration()
    renderPickerTrigger('hero')
    renderPickerTrigger('joiner')
  }

  function generationOption(label: string, meta: string, value: string): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = value === 'all' ? GENERATION_ALL_CLASS : GENERATION_OPTION_CLASS
    button.dataset['reportGenerationOption'] = value
    button.dataset['selected'] = 'false'
    button.setAttribute('aria-pressed', 'false')

    const title = document.createElement('span')
    title.className = GENERATION_LABEL_CLASS
    title.textContent = label

    const detail = document.createElement('span')
    detail.className = GENERATION_META_CLASS
    detail.textContent = meta

    button.append(title, detail)
    return button
  }

  function buildGenerationOptions(): void {
    const generations = Array.from({ length: maxHeroGeneration() }, (_, index) => index + 1)
    generationOptions.replaceChildren(
      generationOption('All gens', 'No generation limit', 'all'),
      ...generations.map((generation) =>
        generationOption(
          `Gen ${generation}`,
          generation === 1 ? 'Gen 1' : `Gen 1–${generation}`,
          String(generation),
        ),
      ),
    )
  }

  function selectGeneration(value: number | null): void {
    filters.max_gen = value ?? undefined
    if (filters.hero && !isHeroAvailable(choiceFor(filters.hero).hero, value)) {
      filters.hero = ''
    }
    if (filters.joiner && !isHeroAvailable(choiceFor(filters.joiner).hero, value)) {
      filters.joiner = ''
    }
    renderTriggers()
    if (generationDialog.open) generationDialog.close()
    notify()
  }

  function openGeneration(): void {
    renderGeneration()
    generationDialog.showModal()
    const selected = generationOptions.querySelector<HTMLButtonElement>(
      '[data-report-generation-option][data-selected="true"]',
    )
    const first = generationOptions.querySelector<HTMLButtonElement>(
      '[data-report-generation-option]',
    )
    ;(selected ?? first)?.focus()
  }

  function matchesQuery(choice: HeroChoice, query: string): boolean {
    const normalized = query
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    if (!normalized) return true
    return choice.hero.name.toLocaleLowerCase().includes(normalized)
  }

  function renderOptions(): void {
    const query = pickerSearch.value
    const choices = currentChoices().filter(
      (choice) =>
        isHeroAvailable(choice.hero, filters.max_gen ?? null) && matchesQuery(choice, query),
    )
    const value = currentValue()
    const nodes: HTMLElement[] = []
    if (query.trim() === '') {
      nodes.push(
        createClearOption({
          kind: 'report',
          label: mode === 'hero' ? 'Any hero' : 'Any joiner',
          meta: 'Clear',
          onSelect: () => selectPickerValue(''),
        }),
      )
    }

    if (choices.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'p-3 text-center text-p3 text-ink-muted'
      empty.textContent = filters.max_gen
        ? `No ${mode === 'hero' ? 'heroes' : 'joiners'} in Gen ${filters.max_gen} or older.`
        : `No ${mode === 'hero' ? 'heroes' : 'joiners'} found.`
      pickerOptions.replaceChildren(...nodes, empty)
      return
    }

    pickerOptions.replaceChildren(
      ...nodes,
      ...choices.map((choice) =>
        createHeroOption(choice.hero, {
          kind: 'report',
          selected: value.toLowerCase() === choice.value,
          onSelect: () => selectPickerValue(choice.value),
        }),
      ),
    )
  }

  function selectPickerValue(value: string): void {
    if (mode === 'hero') {
      filters.hero = value
    } else {
      filters.joiner = value
    }
    renderPickerTrigger(mode)
    if (pickerDialog.open) pickerDialog.close()
    notify()
  }

  function openPicker(kind: PickerKind, trigger: HTMLButtonElement): void {
    mode = kind
    activeTrigger = trigger
    pickerTitle.textContent = `Filter by ${kind}`
    pickerSubtitle.textContent =
      kind === 'hero'
        ? 'Attacker or defender main hero'
        : 'Attacker or defender rally joiner'
    pickerSearch.placeholder = kind === 'hero' ? 'Search heroes' : 'Search joiners'
    pickerSearch.setAttribute(
      'aria-label',
      kind === 'hero' ? 'Search heroes' : 'Search joiners',
    )
    pickerSearch.value = ''
    renderOptions()
    pickerDialog.showModal()
    pickerSearch.focus()
  }

  function resetFilters(): void {
    filters = {}
    syncForm()
    renderTriggers()
    if (pickerDialog.open) pickerDialog.close()
    if (generationDialog.open) generationDialog.close()
    notify()
  }

  buildGenerationOptions()
  if (filters.max_gen) {
    filters.max_gen = Math.min(filters.max_gen, maxHeroGeneration())
    if (filters.hero && !isHeroAvailable(choiceFor(filters.hero).hero, filters.max_gen)) {
      filters.hero = ''
    }
    if (filters.joiner && !isHeroAvailable(choiceFor(filters.joiner).hero, filters.max_gen)) {
      filters.joiner = ''
    }
  }
  syncForm()
  renderTriggers()

  generationTrigger.addEventListener('click', openGeneration)
  generationClose.addEventListener('click', () => generationDialog.close())
  generationDialog.addEventListener('click', (event) => {
    if (event.target === generationDialog) generationDialog.close()
  })
  generationOptions.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const option = event.target.closest<HTMLButtonElement>('[data-report-generation-option]')
    if (!option) return
    const value = option.dataset['reportGenerationOption']
    selectGeneration(value === 'all' ? null : Number(value))
  })
  generationOptions.addEventListener('keydown', (event) => {
    const items = [
      ...generationOptions.querySelectorAll<HTMLButtonElement>(
        '[data-report-generation-option]',
      ),
    ]
    const focused = document.activeElement
    if (!(focused instanceof HTMLButtonElement)) return
    const index = items.indexOf(focused)
    if (index === -1) return

    let next: number | null = null
    if (event.key === 'ArrowRight') next = Math.min(index + 1, items.length - 1)
    else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0)
    else if (event.key === 'ArrowDown') {
      next = index === 0 ? 1 : Math.min(index + GENERATION_COLUMNS, items.length - 1)
    } else if (event.key === 'ArrowUp') next = Math.max(index - GENERATION_COLUMNS, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next === null) return

    event.preventDefault()
    items[next]?.focus()
  })
  generationDialog.addEventListener('close', () => generationTrigger.focus())

  for (const trigger of pickerTriggers) {
    trigger.addEventListener('click', () => {
      const kind = trigger.dataset['reportPickerTrigger']
      if (kind === 'hero' || kind === 'joiner') openPicker(kind, trigger)
    })
  }
  pickerClose.addEventListener('click', () => pickerDialog.close())
  pickerDialog.addEventListener('click', (event) => {
    if (event.target === pickerDialog) pickerDialog.close()
  })
  pickerDialog.addEventListener('close', () => {
    const trigger = activeTrigger
    activeTrigger = null
    pickerSearch.value = ''
    if (trigger) window.setTimeout(() => trigger.focus(), 0)
  })
  pickerSearch.addEventListener('input', () => {
    renderOptions()
    pickerOptions.scrollTop = 0
  })
  pickerSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown') return
    const first = pickerOptions.querySelector<HTMLButtonElement>(
      '[data-report-option]:not([data-report-none])',
    )
    if (!first) return
    event.preventDefault()
    first.focus()
  })
  bindPickerKeyboard(pickerOptions, 'report')

  form.addEventListener('submit', (event) => event.preventDefault())
  form.addEventListener('change', () => {
    filters.result = (form.elements.namedItem('result') as HTMLSelectElement | null)?.value ?? ''
    filters.tier = (form.elements.namedItem('tier') as HTMLSelectElement | null)?.value ?? ''
    filters.fc = (form.elements.namedItem('fc') as HTMLSelectElement | null)?.value ?? ''
    filters.has_t12 =
      (form.elements.namedItem('has_t12') as HTMLInputElement | null)?.checked ?? false
    notify()
  })
  form.addEventListener('reset', () => {
    window.setTimeout(resetFilters, 0)
  })

  return {
    get filters() {
      return filters
    },
    setMeta(meta: ReportMeta): void {
      heroChoices = buildChoices(meta.heroes)
      joinerChoices = buildChoices(meta.joiners)
      for (const trigger of pickerTriggers) trigger.disabled = false
      renderTriggers()
      if (pickerDialog.open) renderOptions()
    },
  }
}
