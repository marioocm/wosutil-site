import {
  bindPickerKeyboard,
  createClearOption,
  createHeroOption,
} from '../components/hero-option'
import { fillHeroVisual } from '../components/hero-visual'
import { HEROES, getHeroByName, isHeroAvailable, type Hero } from '../lib/heroes'
import {
  REPORT_FILTER_SIDES,
  generationFilterLabel,
  heroName,
  isReportFilterSide,
  parseGeneration,
  parseReportFilterEntry,
  reportFilterSideLabel,
  type ReportFilters,
  type ReportFilterSide,
  type ReportHeroFilter,
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

const MAX_FILTERS: Record<PickerKind, number> = { hero: 6, joiner: 8 }
const GENERATION_COLUMNS = 3
const GENERATION_OPTION_CLASS =
  'flex min-h-[3.5rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm border border-line bg-background px-2 py-2 text-center transition-colors hover:border-line-strong hover:bg-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
const GENERATION_ALL_CLASS = `${GENERATION_OPTION_CLASS} col-span-3 min-h-[3rem]`
const GENERATION_LABEL_CLASS =
  'font-primary text-p2 font-medium leading-none tabular-nums'
const GENERATION_META_CLASS = 'font-mono text-[10px] leading-none text-ink-muted'
const ROW_TRIGGER_CLASS =
  'group flex h-9 w-full cursor-pointer items-center gap-2 rounded-sm border border-line bg-background px-2.5 text-left text-p3 text-ink transition-colors hover:border-line-strong hover:bg-tint/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-60'
const ROW_VISUAL_CLASS =
  'relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-xs border border-line bg-tint text-[9px] font-semibold leading-none text-ink-muted'
const ROW_VALUE_CLASS = 'min-w-0 flex-1 truncate'
const SIDE_GROUP_CLASS =
  'grid grid-cols-4 gap-0.5 rounded-sm border border-line bg-paper p-0.5'
const SIDE_BUTTON_CLASS =
  'cursor-pointer rounded-xs px-1 py-1 text-[10px] leading-none text-ink-muted transition-colors hover:bg-tint/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

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

function readEntries(
  params: URLSearchParams,
  key: string,
  max: number,
): ReportHeroFilter[] {
  const entries: ReportHeroFilter[] = []
  const seen = new Set<string>()
  for (const value of params.getAll(key)) {
    const entry = parseReportFilterEntry(value)
    if (!entry || seen.has(entry.name)) continue
    seen.add(entry.name)
    entries.push(entry)
    if (entries.length >= max) break
  }
  return entries
}

function initialFilters(): ReportFilters {
  const params = new URLSearchParams(window.location.search)
  return {
    heroes: readEntries(params, 'hero', MAX_FILTERS.hero),
    joiners: readEntries(params, 'joiner', MAX_FILTERS.joiner),
    result: params.get('result') || '',
    tier: params.get('tier') || '',
    fc: params.get('fc') || '',
    max_gen: parseGeneration(params.get('max_gen')) ?? undefined,
    has_t12: params.get('has_t12') === 'true',
  }
}

function chevronIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.4')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', 'shrink-0 text-ink-muted transition-colors group-hover:text-ink')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'm4 6 4 4 4-4')
  svg.append(path)
  return svg
}

export function initReportFilters(
  onChange: (filters: ReportFilters) => void,
): ReportFiltersController {
  const root = document.querySelector<HTMLElement>('[data-reports]')
  if (!root) throw new Error('Missing reports root')

  const form = must<HTMLFormElement>(root, '[data-report-filters]')
  const resultSelect = must<HTMLSelectElement>(form, 'select[name="result"]')
  const generationTrigger = must<HTMLButtonElement>(root, '[data-report-generation-trigger]')
  const generationValue = must<HTMLElement>(root, '[data-report-generation-value]')
  const generationDialog = must<HTMLDialogElement>(root, '#report-generation-picker')
  const generationOptions = must<HTMLElement>(root, '[data-report-generation-options]')
  const generationClose = must<HTMLButtonElement>(root, '[data-report-generation-close]')
  const heroRows = must<HTMLElement>(root, '[data-report-hero-rows]')
  const joinerRows = must<HTMLElement>(root, '[data-report-joiner-rows]')
  const pickerDialog = must<HTMLDialogElement>(root, '#report-picker')
  const pickerTitle = must<HTMLElement>(root, '#report-picker-title')
  const pickerSubtitle = must<HTMLElement>(root, '[data-report-picker-subtitle]')
  const pickerSearch = must<HTMLInputElement>(root, '[data-report-picker-search]')
  const pickerOptions = must<HTMLElement>(root, '[data-report-picker-options]')
  const pickerClose = must<HTMLButtonElement>(root, '[data-report-picker-close]')

  let filters = initialFilters()
  let heroChoices: HeroChoice[] = []
  let joinerChoices: HeroChoice[] = []
  let metaReady = false
  let mode: PickerKind = 'hero'
  let activeIndex = 0
  let activeTrigger: HTMLButtonElement | null = null

  function currentChoices(): HeroChoice[] {
    return mode === 'hero' ? heroChoices : joinerChoices
  }

  function entriesFor(kind: PickerKind): ReportHeroFilter[] {
    return kind === 'hero' ? filters.heroes ?? [] : filters.joiners ?? []
  }

  function setEntries(kind: PickerKind, entries: ReportHeroFilter[]): void {
    if (kind === 'hero') {
      filters.heroes = entries
    } else {
      filters.joiners = entries
    }
  }

  function rowContainer(kind: PickerKind): HTMLElement {
    return kind === 'hero' ? heroRows : joinerRows
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

  function buildRow(
    kind: PickerKind,
    entry: ReportHeroFilter | null,
    index: number,
  ): HTMLElement {
    const row = document.createElement('div')
    row.className = 'grid gap-1.5'
    row.dataset['reportRow'] = kind
    row.dataset['index'] = String(index)

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = ROW_TRIGGER_CLASS
    trigger.dataset['reportRowTrigger'] = kind
    trigger.dataset['index'] = String(index)
    trigger.dataset['selected'] = entry ? 'true' : 'false'
    trigger.disabled = !metaReady
    trigger.setAttribute('aria-haspopup', 'dialog')
    trigger.setAttribute('aria-controls', 'report-picker')
    trigger.setAttribute(
      'aria-label',
      entry ? `Filter by ${kind}: ${heroName(entry.name)}` : `Add ${kind}`,
    )

    const visual = document.createElement('span')
    visual.className = ROW_VISUAL_CLASS
    visual.setAttribute('aria-hidden', 'true')
    fillHeroVisual(visual, entry ? choiceFor(entry.name).hero : null)

    const value = document.createElement('span')
    value.className = ROW_VALUE_CLASS
    value.textContent = entry ? heroName(entry.name) : `Any ${kind}`

    trigger.append(visual, value, chevronIcon())
    row.append(trigger)

    if (entry) {
      const group = document.createElement('div')
      group.className = SIDE_GROUP_CLASS
      group.setAttribute('role', 'group')
      group.setAttribute('aria-label', `${kind === 'hero' ? 'Hero' : 'Joiner'} side`)
      for (const side of REPORT_FILTER_SIDES) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = SIDE_BUTTON_CLASS
        button.dataset['reportSide'] = side
        button.dataset['reportSideKind'] = kind
        button.dataset['index'] = String(index)
        button.dataset['selected'] = entry.side === side ? 'true' : 'false'
        button.setAttribute('aria-pressed', entry.side === side ? 'true' : 'false')
        button.textContent = reportFilterSideLabel(side)
        group.append(button)
      }
      row.append(group)
    }

    return row
  }

  function renderRows(kind: PickerKind): void {
    const entries = entriesFor(kind)
    const rows = entries.map((entry, index) => buildRow(kind, entry, index))
    if (entries.length < MAX_FILTERS[kind]) {
      rows.push(buildRow(kind, null, entries.length))
    }
    rowContainer(kind).replaceChildren(...rows)
  }

  function renderTriggers(): void {
    renderGeneration()
    renderRows('hero')
    renderRows('joiner')
  }

  function applyResultAvailability(meta: ReportMeta): void {
    for (const option of resultSelect.options) {
      if (!option.value) continue
      option.hidden = !meta.results[option.value]
    }
    if (filters.result && !meta.results[filters.result]) {
      filters.result = ''
      resultSelect.value = ''
      notify()
    }
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
    const max = value ?? null
    filters.max_gen = value ?? undefined
    filters.heroes = (filters.heroes ?? []).filter((entry) =>
      isHeroAvailable(choiceFor(entry.name).hero, max),
    )
    filters.joiners = (filters.joiners ?? []).filter((entry) =>
      isHeroAvailable(choiceFor(entry.name).hero, max),
    )
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
    const entries = entriesFor(mode)
    const current = entries[activeIndex]
    const used = new Set(
      entries
        .filter((_, index) => index !== activeIndex)
        .map((entry) => entry.name),
    )
    const available = currentChoices().filter(
      (choice) =>
        isHeroAvailable(choice.hero, filters.max_gen ?? null) &&
        matchesQuery(choice, query),
    )
    const choices = available.filter((choice) => !used.has(choice.value))
    const nodes: HTMLElement[] = []
    if (query.trim() === '' && current) {
      nodes.push(
        createClearOption({
          kind: 'report',
          label: `Any ${mode}`,
          meta: 'Clear',
          onSelect: clearPickerValue,
        }),
      )
    }

    if (choices.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'p-3 text-center text-p3 text-ink-muted'
      empty.textContent =
        available.length > 0
          ? `All matching ${mode === 'hero' ? 'heroes' : 'joiners'} are already selected.`
          : filters.max_gen
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
          selected: current?.name === choice.value,
          onSelect: () => selectPickerValue(choice.value),
        }),
      ),
    )
  }

  function rowTrigger(kind: PickerKind, index: number): HTMLButtonElement | null {
    return rowContainer(kind).querySelector<HTMLButtonElement>(
      `[data-report-row-trigger][data-index="${index}"]`,
    )
  }

  function selectPickerValue(name: string): void {
    const entries = entriesFor(mode)
    if (activeIndex < entries.length) {
      entries[activeIndex] = { ...entries[activeIndex], name }
    } else {
      entries.push({ name, side: 'any' })
    }
    setEntries(mode, entries)
    renderRows(mode)
    activeTrigger = rowTrigger(mode, Math.min(activeIndex, entries.length - 1))
    if (pickerDialog.open) pickerDialog.close()
    notify()
  }

  function clearPickerValue(): void {
    const entries = entriesFor(mode)
    if (activeIndex >= entries.length) return
    entries.splice(activeIndex, 1)
    setEntries(mode, entries)
    renderRows(mode)
    activeTrigger = rowTrigger(mode, Math.min(activeIndex, entries.length))
    if (pickerDialog.open) pickerDialog.close()
    notify()
  }

  function selectSide(kind: PickerKind, index: number, side: ReportFilterSide): void {
    const entries = entriesFor(kind)
    const entry = entries[index]
    if (!entry || entry.side === side) return
    entry.side = side
    for (const button of rowContainer(kind).querySelectorAll<HTMLButtonElement>(
      '[data-report-side]',
    )) {
      if (Number(button.dataset['index']) !== index) continue
      const selected = button.dataset['reportSide'] === side
      button.dataset['selected'] = selected ? 'true' : 'false'
      button.setAttribute('aria-pressed', selected ? 'true' : 'false')
    }
    notify()
  }

  function openPicker(
    kind: PickerKind,
    index: number,
    trigger: HTMLButtonElement,
  ): void {
    mode = kind
    activeIndex = index
    activeTrigger = trigger
    const existing = entriesFor(kind)[index]
    pickerTitle.textContent = existing ? `Replace ${kind}` : `Add ${kind}`
    pickerSubtitle.textContent =
      kind === 'hero'
        ? 'Main hero · attacker or defender side'
        : 'Rally joiner · attacker or defender side'
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

  function handleRowsClick(kind: PickerKind, event: Event): void {
    if (!(event.target instanceof Element)) return
    const sideButton = event.target.closest<HTMLButtonElement>('[data-report-side]')
    if (sideButton && sideButton.dataset['reportSideKind'] === kind) {
      const index = Number(sideButton.dataset['index'])
      const side = sideButton.dataset['reportSide']
      if (Number.isInteger(index) && side && isReportFilterSide(side)) {
        selectSide(kind, index, side)
      }
      return
    }
    const trigger = event.target.closest<HTMLButtonElement>('[data-report-row-trigger]')
    if (trigger && trigger.dataset['reportRowTrigger'] === kind) {
      openPicker(kind, Number(trigger.dataset['index']), trigger)
    }
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
    filters.heroes = (filters.heroes ?? []).filter((entry) =>
      isHeroAvailable(choiceFor(entry.name).hero, filters.max_gen ?? null),
    )
    filters.joiners = (filters.joiners ?? []).filter((entry) =>
      isHeroAvailable(choiceFor(entry.name).hero, filters.max_gen ?? null),
    )
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

  heroRows.addEventListener('click', (event) => handleRowsClick('hero', event))
  joinerRows.addEventListener('click', (event) => handleRowsClick('joiner', event))

  pickerClose.addEventListener('click', () => pickerDialog.close())
  pickerDialog.addEventListener('click', (event) => {
    if (event.target === pickerDialog) pickerDialog.close()
  })
  pickerDialog.addEventListener('close', () => {
    const trigger = activeTrigger
    activeTrigger = null
    pickerSearch.value = ''
    if (trigger?.isConnected) window.setTimeout(() => trigger.focus(), 0)
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
      metaReady = true
      renderTriggers()
      applyResultAvailability(meta)
      if (pickerDialog.open) renderOptions()
    },
  }
}
