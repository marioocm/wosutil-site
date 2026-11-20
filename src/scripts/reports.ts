import { STAT_BONUSES } from '../lib/stat-bonuses'
import { getHeroByName, heroInitials } from '../lib/heroes'
import { getHeroImage } from '../lib/hero-images'
import {
  TROOP_CLASSES,
  buildQuery,
  classLabel,
  fetchJson,
  formatNumber,
  formatPercent,
  formatSkill,
  generationLabel,
  heroName,
  isRally,
  maxTroopLevel,
  ratioText,
  reportDownloadPath,
  reportGeneration,
  resultLabel,
  survivorRate,
  type ReportDetail,
  type ReportFilters,
  type ReportListItem,
  type ReportList,
  type ReportMeta,
  type ReportStats,
  type SideDetail,
  type SideKey,
  type Troop,
  type TroopClass,
} from '../lib/reports'

const SIDE_LABEL: Record<SideKey, string> = { attacker: 'Attacker', defender: 'Defender' }
const SHORT_LABEL: Record<TroopClass, string> = { infantry: 'INF', lancer: 'LAN', marksman: 'MAR' }
const CLASS_ORDER: Record<TroopClass, number> = { infantry: 0, lancer: 1, marksman: 2 }
const BASE = import.meta.env.BASE_URL

interface State {
  filters: ReportFilters
  cursor: number | null
  loading: boolean
  items: ReportListItem[]
  meta: ReportMeta | null
  total: number
  currentId: string | null
  request: number
}

function must<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Missing reports element: ${selector}`)
  return element
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function compact(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) < 10_000) return formatNumber(value)
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function statValue(value: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)}%`
}

function parseFc(value: string | null | undefined): number | null {
  const text = String(value || '').trim().toUpperCase().replace('FC', '')
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function heroAvatar(name: string | null | undefined, extra = ''): string {
  const hero = name ? getHeroByName(name) : null
  const src = hero ? getHeroImage(hero.id) : undefined
  const initials = name ? heroInitials(heroName(name)) : '—'
  return `
    <span class="rp-avatar ${extra}" title="${escapeHtml(heroName(name))}">
      <span class="rp-avatar-fallback">${escapeHtml(initials)}</span>
      ${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()" />` : ''}
    </span>`
}

function heroCell(name: string | null | undefined, troopClass: TroopClass, side: SideKey): string {
  const empty = !name
  return `
    <div class="rp-hero-cell is-${side}${empty ? ' is-empty' : ''}">
      ${heroAvatar(name, 'rp-avatar-lg')}
      <span class="rp-hero-copy">
        <strong>${escapeHtml(empty ? 'No hero' : heroName(name))}</strong>
        <span>${classLabel(troopClass)}</span>
      </span>
    </div>`
}

function miniHero(name: string | null | undefined): string {
  const empty = !name
  return `
    <span class="rp-mini-hero${empty ? ' is-empty' : ''}" title="${escapeHtml(empty ? 'No hero' : heroName(name))}">
      ${heroAvatar(name, 'rp-avatar-sm')}
      <span>${escapeHtml(empty ? '—' : heroName(name))}</span>
    </span>`
}

function ratioBar(ratio: { infantry: number; lancer: number; marksman: number }, detailed = false): string {
  const total = ratio.infantry + ratio.lancer + ratio.marksman
  if (total <= 0) return '<span class="rp-muted">No ratio</span>'
  return `
    <span class="rp-ratio-track" aria-hidden="true">
      <span class="rp-ratio-fill is-infantry" style="width:${ratio.infantry.toFixed(2)}%"></span>
      <span class="rp-ratio-fill is-lancer" style="width:${ratio.lancer.toFixed(2)}%"></span>
      <span class="rp-ratio-fill is-marksman" style="width:${ratio.marksman.toFixed(2)}%"></span>
    </span>
    ${
      detailed
        ? `<span class="rp-ratio-legend"><span>INF/LAN/MAR</span><span class="rp-ratio-legend-sep" aria-hidden="true">—</span><span class="rp-ratio-legend-value">${ratioText(ratio)}</span></span>`
        : `<span class="rp-ratio-text">${ratioText(ratio)}</span>`
    }`
}

function renderCard(item: ReportListItem): string {
  const attRate = survivorRate(item.attacker_survivors, item.attacker_troops)
  const defRate = survivorRate(item.defender_survivors, item.defender_troops)
  const level = maxTroopLevel(item)
  const rally = isRally(item)
  const joinerCount = (item.joiners.attacker?.length ?? 0) + (item.joiners.defender?.length ?? 0)
  const heroes = (side: SideKey) =>
    TROOP_CLASSES.map((troopClass) => miniHero(item.heroes[side]?.[troopClass])).join('')
  const ratio = (side: SideKey) =>
    ratioBar(item.ratio[side] || { infantry: 0, lancer: 0, marksman: 0 })
  return `
    <button type="button" class="rp-card" data-report-id="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(generationLabel(reportGeneration(item)))} report">
      <span class="rp-card-head">
        <span class="rp-gen">${escapeHtml(generationLabel(reportGeneration(item)))}</span>
        <span class="rp-card-badges">
          <span class="rp-tier-badge">${level.tier === null ? 'T—' : `T${level.tier}`}</span>
          <span class="rp-fc-text">${level.fc === null ? 'FC—' : `FC${level.fc}`}</span>
          <span class="rp-mode">${rally ? 'Rally' : '1v1'}</span>
        </span>
      </span>
      <span class="rp-card-troops">
        <span class="rp-card-side">
          <span class="rp-card-side-head"><span>ATT</span><span>${compact(item.attacker_troops)}</span></span>
          <span class="rp-bar"><span style="width:${(attRate * 100).toFixed(2)}%"></span></span>
        </span>
        <span class="rp-card-side is-right">
          <span class="rp-card-side-head"><span>DEF</span><span>${compact(item.defender_troops)}</span></span>
          <span class="rp-bar is-defender"><span style="width:${(defRate * 100).toFixed(2)}%"></span></span>
        </span>
      </span>
      <span class="rp-card-side-block">
        <span class="rp-card-side-row"><span class="rp-card-tag">ATT</span><span class="rp-mini-heroes">${heroes('attacker')}</span></span>
        <span class="rp-card-ratio">${ratio('attacker')}</span>
      </span>
      <span class="rp-card-side-block">
        <span class="rp-card-side-row"><span class="rp-card-tag">DEF</span><span class="rp-mini-heroes">${heroes('defender')}</span></span>
        <span class="rp-card-ratio">${ratio('defender')}</span>
      </span>
      <span class="rp-card-foot">
        <span>${rally ? `${joinerCount} joiner${joinerCount === 1 ? '' : 's'}` : 'No joiners'}</span>
        <span>${formatNumber(item.attacker_survivors + item.defender_survivors)} survivors</span>
      </span>
    </button>`
}

function detailKicker(detail: ReportDetail): string {
  const troops = [...(detail.attacker.troops || []), ...(detail.defender.troops || [])]
  const tiers = troops.map((troop) => troop.tier).filter((tier) => Number.isFinite(tier))
  const tier = tiers.length ? Math.max(...tiers) : null
  const fcs = troops
    .filter((troop) => troop.tier === tier)
    .map((troop) => parseFc(troop.furnace))
    .filter((fc): fc is number => fc !== null)
  const fc = fcs.length ? Math.max(...fcs) : null
  const generation = reportGeneration({
    heroes: { attacker: detail.attacker.heroes, defender: detail.defender.heroes },
    joiners: { attacker: detail.attacker.joiners, defender: detail.defender.joiners },
  })
  const rally = isRally({ joiners: { attacker: detail.attacker.joiners, defender: detail.defender.joiners } })
  return `${generationLabel(generation)} · ${tier === null ? 'T—' : `T${tier}`} · ${fc === null ? 'FC—' : `FC${fc}`} · ${rally ? 'Rally' : '1v1'}`
}

function overviewRows(side: SideDetail): Array<[string, number]> {
  return [
    ['Troops', side.totals.troops],
    ['Losses', side.totals.losses],
    ['Injured', side.totals.injured],
    ['Lightly Injured', side.totals.lightly_injured],
    ['Survivors', side.totals.survivors],
  ]
}

function renderOverview(detail: ReportDetail): string {
  const attacker = overviewRows(detail.attacker)
  const defender = overviewRows(detail.defender)
  return `
    <section class="rp-section" aria-labelledby="rp-overview-title">
      <h3 id="rp-overview-title" class="rp-section-title">Battle Overview</h3>
      <div class="rp-overview">
        <div class="rp-overview-head"><span>Attacker</span><span></span><span>Defender</span></div>
        ${attacker
          .map(
            ([label, value], index) => `
          <div class="rp-overview-row">
            <strong class="rp-overview-left">${formatNumber(value)}</strong>
            <span class="rp-overview-label">${label}</span>
            <strong class="rp-overview-right">${formatNumber(defender[index]?.[1] ?? 0)}</strong>
          </div>`,
          )
          .join('')}
      </div>
    </section>`
}

function renderHeroComparison(detail: ReportDetail): string {
  return `
    <section class="rp-section" aria-labelledby="rp-heroes-title">
      <h3 id="rp-heroes-title" class="rp-section-title">Hero Comparison</h3>
      <div class="rp-hero-compare">
        ${TROOP_CLASSES.map(
          (troopClass) => `
          <div class="rp-hero-row">
            ${heroCell(detail.attacker.heroes[troopClass], troopClass, 'attacker')}
            <span class="rp-class-center">${SHORT_LABEL[troopClass]}</span>
            ${heroCell(detail.defender.heroes[troopClass], troopClass, 'defender')}
          </div>`,
        ).join('')}
      </div>
    </section>`
}

function renderJoiners(detail: ReportDetail): string {
  if (!detail.attacker.joiners.length && !detail.defender.joiners.length) return ''
  const side = (sideKey: SideKey, sideDetail: SideDetail) => `
    <div class="rp-joiner-side">
      <span class="rp-joiner-label">${SIDE_LABEL[sideKey]}</span>
      <div class="rp-joiner-list">
        ${
          sideDetail.joiners.length
            ? sideDetail.joiners
                .map(
                  (name) => `
              <span class="rp-joiner">
                ${heroAvatar(name, 'rp-avatar-sm')}
                <span>${escapeHtml(heroName(name))}</span>
              </span>`,
                )
                .join('')
            : '<span class="rp-muted">No joiners · 1v1</span>'
        }
      </div>
    </div>`
  return `
    <section class="rp-section" aria-labelledby="rp-joiners-title">
      <h3 id="rp-joiners-title" class="rp-section-title">Joiners</h3>
      <div class="rp-joiner-grid">
        ${side('attacker', detail.attacker)}
        ${side('defender', detail.defender)}
      </div>
    </section>`
}

function classSummary(side: SideDetail, troopClass: TroopClass): { tier: number | null; fc: number | null; count: number; groups: Troop[] } {
  const groups = (side.troops || [])
    .filter((troop) => troop.class === troopClass)
    .sort((left, right) => right.tier - left.tier || (parseFc(right.furnace) ?? -1) - (parseFc(left.furnace) ?? -1))
  const top = groups[0]
  return {
    tier: top ? top.tier : null,
    fc: top ? parseFc(top.furnace) : null,
    count: groups.reduce((sum, troop) => sum + troop.count, 0),
    groups,
  }
}

function troopTile(side: SideDetail, troopClass: TroopClass): string {
  const summary = classSummary(side, troopClass)
  const t12Level = Number(side.t12_skills?.[troopClass] ?? 0)
  if (!summary.groups.length) {
    return `
      <div class="rp-troop-slot is-empty">
        <span class="rp-troop-tile">
          <span class="rp-tile-class">${SHORT_LABEL[troopClass]}</span>
          <span class="rp-tile-tier">T—</span>
        </span>
        <span class="rp-tile-count">—</span>
      </div>`
  }
  const title = summary.groups
    .map((troop) => `T${troop.tier} ${troop.furnace || 'FC—'}: ${formatNumber(troop.count)}`)
    .join(' · ')
  return `
    <div class="rp-troop-slot" title="${escapeHtml(title)}">
      <span class="rp-troop-tile">
        <span class="rp-tile-class">${SHORT_LABEL[troopClass]}</span>
        <span class="rp-tile-tier">T${summary.tier ?? '—'}</span>
        ${
          summary.fc === null
            ? ''
            : `<span class="rp-tile-fc"><span class="troop-fc-hex"><span class="troop-fc-value">${summary.fc}</span></span></span>`
        }
      </span>
      ${summary.tier === 12 ? `<span class="rp-tile-t12">Lv ${t12Level}</span>` : ''}
      <span class="rp-tile-count">${formatNumber(summary.count)}</span>
    </div>`
}

function renderTroopPower(detail: ReportDetail): string {
  const side = (sideKey: SideKey, sideDetail: SideDetail) => `
    <div class="rp-troop-side" role="group" aria-label="${SIDE_LABEL[sideKey]} troop power">
      <div class="rp-troop-ratio">
        ${ratioBar(detail.ratio[sideKey] || { infantry: 0, lancer: 0, marksman: 0 }, true)}
      </div>
      <div class="rp-troop-slots">
        ${TROOP_CLASSES.map((troopClass) => troopTile(sideDetail, troopClass)).join('')}
      </div>
    </div>`
  return `
    <section class="rp-section" aria-labelledby="rp-troops-title">
      <h3 id="rp-troops-title" class="rp-section-title">Troop Power Comparison</h3>
      <div class="rp-troop-grid">
        ${side('attacker', detail.attacker)}
        ${side('defender', detail.defender)}
      </div>
    </section>`
}

function renderStats(detail: ReportDetail): string {
  const rows = STAT_BONUSES.map((stat) => {
    const [troopClass, field] = stat.id.split('-') as [TroopClass, 'attack' | 'defense' | 'lethality' | 'health']
    const attacker = Number(detail.attacker.stat_bonuses?.[troopClass]?.[field] ?? 0)
    const defender = Number(detail.defender.stat_bonuses?.[troopClass]?.[field] ?? 0)
    const attackerState = attacker > defender ? 'higher' : attacker < defender ? 'lower' : 'equal'
    const defenderState = defender > attacker ? 'higher' : defender < attacker ? 'lower' : 'equal'
    return `
      <tr>
        <td class="rp-stat-left" data-stat-state="${attackerState}">${statValue(attacker)}</td>
        <th scope="row">${escapeHtml(stat.label)}</th>
        <td class="rp-stat-right" data-stat-state="${defenderState}">${statValue(defender)}</td>
      </tr>`
  }).join('')
  return `
    <section class="rp-section" aria-labelledby="rp-stats-title">
      <h3 id="rp-stats-title" class="rp-section-title">Stat Bonuses</h3>
      <div class="rp-stat-card">
        <table class="rp-stat-table">
          <colgroup><col /><col class="rp-stat-label-col" /><col /></colgroup>
          <thead><tr><th>Attacker</th><th><span class="sr-only">Stat</span></th><th>Defender</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`
}

function renderBattleHeroPair(detail: ReportDetail, troopClass: TroopClass): string {
  const leftHero = detail.attacker.heroes[troopClass]
  const rightHero = detail.defender.heroes[troopClass]
  const leftSkills = (detail.attacker.skill_details || []).filter((skill) => skill.class === troopClass)
  const rightSkills = (detail.defender.skill_details || []).filter((skill) => skill.class === troopClass)
  const rows = Math.max(leftSkills.length, rightSkills.length)
  const skillRows = Array.from({ length: rows }, (_, index) => {
    const left = leftSkills[index]
    const right = rightSkills[index]
    return `
      <div class="rp-bd-skill-row">
        <span class="rp-bd-skill-name is-left" title="${escapeHtml(left ? formatSkill(left.skill) : '')}">${left ? escapeHtml(formatSkill(left.skill)) : '—'}</span>
        <span class="rp-bd-trig">${left ? formatNumber(left.triggered) : '—'}</span>
        <span class="rp-bd-kills">${left ? (left.kills === null ? '—' : formatNumber(left.kills)) : '—'}</span>
        <span class="rp-bd-kills is-right">${right ? (right.kills === null ? '—' : formatNumber(right.kills)) : '—'}</span>
        <span class="rp-bd-trig is-right">${right ? formatNumber(right.triggered) : '—'}</span>
        <span class="rp-bd-skill-name is-right" title="${escapeHtml(right ? formatSkill(right.skill) : '')}">${right ? escapeHtml(formatSkill(right.skill)) : '—'}</span>
      </div>`
  }).join('')
  return `
    <div class="rp-bd-hero-pair">
      <div class="rp-bd-hero-head-row">
        <div class="rp-bd-hero-head is-left">
          ${heroAvatar(leftHero, 'rp-avatar-md')}
          <div>
            <strong>${escapeHtml(leftHero ? heroName(leftHero) : 'No hero')}</strong>
            <span>${classLabel(troopClass)}</span>
          </div>
        </div>
        <span class="rp-class-center">${SHORT_LABEL[troopClass]}</span>
        <div class="rp-bd-hero-head is-right">
          ${heroAvatar(rightHero, 'rp-avatar-md')}
          <div>
            <strong>${escapeHtml(rightHero ? heroName(rightHero) : 'No hero')}</strong>
            <span>${classLabel(troopClass)}</span>
          </div>
        </div>
      </div>
      <div class="rp-bd-skill-table">
        <div class="rp-bd-skill-head">
          <span>Skill</span><span>Triggered</span><span>Kills</span><span>Kills</span><span>Triggered</span><span>Skill</span>
        </div>
        ${skillRows || '<div class="rp-bd-skill-row"><span class="rp-muted">No activations.</span></div>'}
      </div>
    </div>`
}

function renderBattleTroops(sideKey: SideKey, side: SideDetail): string {
  const rows = [...(side.troops || [])]
    .sort(
      (left, right) =>
        (CLASS_ORDER[left.class] ?? 9) - (CLASS_ORDER[right.class] ?? 9) ||
        right.tier - left.tier,
    )
    .map(
      (troop) => `
      <tr>
        <th scope="row" title="${escapeHtml(`${classLabel(troop.class)} · T${troop.tier} · ${troop.furnace || 'FC—'}`)}">${classLabel(troop.class)} · T${troop.tier} · ${escapeHtml(troop.furnace || 'FC—')}</th>
        <td>${formatNumber(troop.count)}</td>
        <td>${formatNumber(troop.injured)}</td>
        <td>${formatNumber(troop.losses)}</td>
        <td>${formatNumber(troop.kills)}</td>
        <td>${formatNumber(troop.lightly_injured)}</td>
        <td>${formatNumber(troop.survivors)}</td>
      </tr>`,
    )
    .join('')
  return `
    <div class="rp-bd-troop-side is-${sideKey}">
      <h4>${SIDE_LABEL[sideKey]}</h4>
      ${
        rows
          ? `<table class="rp-bd-troop-table">
              <caption class="sr-only">${SIDE_LABEL[sideKey]} troop results</caption>
              <colgroup>
                <col class="rp-bd-col-troop" />
                <col class="rp-bd-col-troops" />
                <col class="rp-bd-col-injured" />
                <col class="rp-bd-col-losses" />
                <col class="rp-bd-col-kills" />
                <col class="rp-bd-col-slightly" />
                <col class="rp-bd-col-survivors" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Troop</th>
                  <th scope="col">Troops</th>
                  <th scope="col">Injured</th>
                  <th scope="col">Losses</th>
                  <th scope="col">Kills</th>
                  <th scope="col">Slightly Injured</th>
                  <th scope="col">Survivors</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
          : '<p class="rp-muted">No troop rows.</p>'
      }
    </div>`
}

function renderBattleDetails(detail: ReportDetail): string {
  return `
    <aside class="rp-battle-card" aria-labelledby="rp-battle-title">
      <h3 id="rp-battle-title" class="sr-only">Battle Details</h3>
      <div class="rp-battle-toggle">
        <button type="button" class="rp-battle-button" data-battle-details-toggle aria-expanded="false">
          Battle Details
        </button>
      </div>
      <div class="rp-battle-details" data-battle-details hidden>
        <div class="rp-bd-heroes">
          ${TROOP_CLASSES.map((troopClass) => renderBattleHeroPair(detail, troopClass)).join('')}
        </div>
        <div class="rp-bd-troops">
          ${renderBattleTroops('attacker', detail.attacker)}
          ${renderBattleTroops('defender', detail.defender)}
        </div>
      </div>
    </aside>`
}

function renderDetail(detail: ReportDetail): string {
  return `
    <div class="rp-report">
      <div class="rp-report-layout">
        <article class="rp-report-main">
          <h2 id="rp-detail-title" class="sr-only">${escapeHtml(resultLabel(detail.result))}</h2>
          ${renderOverview(detail)}
          ${renderHeroComparison(detail)}
          ${renderJoiners(detail)}
          ${renderTroopPower(detail)}
          ${renderStats(detail)}
          <div class="rp-actions">
            <a class="rp-action" href="${reportDownloadPath(detail.id, 'json')}" download>Download JSON</a>
            <a class="rp-action" href="${reportDownloadPath(detail.id, 'csv')}" download>Download CSV</a>
            <button type="button" class="rp-action" data-copy-link>Copy link</button>
          </div>
        </article>
        ${renderBattleDetails(detail)}
      </div>
    </div>`
}

function parsePathId(): string | null {
  const match = window.location.pathname.match(/\/reports\/([0-9a-f]{16,64})\/?$/)
  return match?.[1] ?? null
}

function initialFilters(): ReportFilters {
  const params = new URLSearchParams(window.location.search)
  return {
    hero: params.get('hero') || '',
    joiner: params.get('joiner') || '',
    result: params.get('result') || '',
    tier: params.get('tier') || '',
    fc: params.get('fc') || '',
    has_t12: params.get('has_t12') === 'true',
  }
}

export function initReports(): void {
  const root = document.querySelector<HTMLElement>('[data-reports]')
  if (!root) return
  const form = must<HTMLFormElement>(root, '[data-report-filters]')
  const list = must<HTMLElement>(root, '[data-report-list]')
  const empty = must<HTMLElement>(root, '[data-report-empty]')
  const loadMore = must<HTMLButtonElement>(root, '[data-report-load]')
  const count = must<HTMLElement>(root, '[data-report-count]')
  const status = must<HTMLElement>(root, '[data-report-status]')
  const dialog = must<HTMLDialogElement>(root, '[data-report-dialog]')
  const detailRoot = must<HTMLElement>(dialog, '[data-report-detail]')
  const dialogMeta = must<HTMLElement>(dialog, '[data-report-meta]')
  const closeButton = must<HTMLButtonElement>(dialog, '[data-report-close]')
  const heroOptions = must<HTMLDataListElement>(root, '#report-hero-options')
  const joinerOptions = must<HTMLDataListElement>(root, '#report-joiner-options')
  const state: State = {
    filters: initialFilters(),
    cursor: null,
    loading: false,
    items: [],
    meta: null,
    total: 0,
    currentId: null,
    request: 0,
  }

  const desktopLayout = window.matchMedia('(min-width: 1024px)')

  const syncBattleDetails = (): void => {
    const panel = detailRoot.querySelector<HTMLElement>('[data-battle-details]')
    const toggle = detailRoot.querySelector<HTMLButtonElement>('[data-battle-details-toggle]')
    if (!panel || !toggle) return
    const expanded = desktopLayout.matches
    toggle.setAttribute('aria-expanded', String(expanded))
    toggle.textContent = expanded ? 'Hide Battle Details' : 'Battle Details'
    panel.hidden = !expanded
  }

  const setStatus = (text: string, error = false): void => {
    status.textContent = text
    status.dataset.error = error ? 'true' : 'false'
  }

  const setFormValues = (): void => {
    for (const [key, value] of Object.entries(state.filters)) {
      const field = form.elements.namedItem(key)
      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        field.checked = Boolean(value)
      } else if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
        field.value = value === undefined || value === null ? '' : String(value)
      }
    }
  }

  const readFilters = (): ReportFilters => ({
    hero: (form.elements.namedItem('hero') as HTMLInputElement | null)?.value ?? '',
    joiner: (form.elements.namedItem('joiner') as HTMLInputElement | null)?.value ?? '',
    result: (form.elements.namedItem('result') as HTMLSelectElement | null)?.value ?? '',
    tier: (form.elements.namedItem('tier') as HTMLSelectElement | null)?.value ?? '',
    fc: (form.elements.namedItem('fc') as HTMLSelectElement | null)?.value ?? '',
    has_t12: (form.elements.namedItem('has_t12') as HTMLInputElement | null)?.checked ?? false,
  })

  const syncUrl = (): void => {
    if (state.currentId) return
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(state.filters)) {
      if (value) params.set(key, String(value))
    }
    const query = params.toString()
    window.history.replaceState({}, '', `${BASE}reports/${query ? `?${query}` : ''}`)
  }

  const setMeta = (meta: ReportMeta): void => {
    state.meta = meta
    heroOptions.innerHTML = meta.heroes.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('')
    joinerOptions.innerHTML = meta.joiners.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('')
    state.total = meta.total
    updateCount()
  }

  const loadMeta = async (): Promise<void> => {
    try {
      setMeta(await fetchJson<ReportMeta>('/v1/meta'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load filters.', true)
    }
  }

  const loadStats = async (): Promise<void> => {
    try {
      const stats = await fetchJson<ReportStats>('/v1/stats')
      const reportsTarget = root.querySelector<HTMLElement>('[data-stat-reports]')
      const attackerTarget = root.querySelector<HTMLElement>('[data-stat-attacker]')
      const defenderTarget = root.querySelector<HTMLElement>('[data-stat-defender]')
      if (reportsTarget) reportsTarget.textContent = formatNumber(stats.reports)
      if (attackerTarget) attackerTarget.textContent = formatPercent(stats.attacker_win_rate)
      if (defenderTarget) defenderTarget.textContent = formatPercent(stats.defender_win_rate)
    } catch {
      // The header counters are decorative.
    }
  }

  const updateCount = (): void => {
    const total = state.total
    count.textContent = total
      ? state.items.length >= total
        ? `${formatNumber(total)} reports`
        : `${formatNumber(state.items.length)} of ${formatNumber(total)} reports`
      : `${formatNumber(state.items.length)} reports`
  }

  const renderItems = (items: ReportListItem[], append: boolean): void => {
    if (!append) list.innerHTML = ''
    list.insertAdjacentHTML('beforeend', items.map(renderCard).join(''))
    empty.hidden = state.items.length > 0
    updateCount()
  }

  const loadPage = async (reset: boolean): Promise<void> => {
    if (state.loading) return
    state.loading = true
    const request = ++state.request
    if (reset) {
      state.items = []
      state.cursor = null
      list.innerHTML = ''
      empty.hidden = true
    }
    loadMore.disabled = true
    setStatus('Loading reports…')
    try {
      const query = buildQuery(state.filters, state.cursor)
      const payload = await fetchJson<ReportList>(`/v1/reports?${query}`)
      if (request !== state.request) return
      state.items = reset ? payload.items : [...state.items, ...payload.items]
      state.cursor = payload.next_cursor
      state.total = payload.total
      renderItems(payload.items, !reset)
      loadMore.hidden = state.cursor === null
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load reports.', true)
    } finally {
      if (request === state.request) {
        state.loading = false
        loadMore.disabled = false
      }
    }
  }

  const openDetail = async (id: string, push = true): Promise<void> => {
    if (!/^[0-9a-f]{16,64}$/.test(id)) return
    state.currentId = id
    setStatus('Loading report…')
    try {
      const detail = await fetchJson<ReportDetail>(`/v1/reports/${id}`)
      detailRoot.innerHTML = renderDetail(detail)
      dialogMeta.textContent = detailKicker(detail)
      syncBattleDetails()
      if (!dialog.open) dialog.showModal()
      if (push) window.history.pushState({ id }, '', `${BASE}reports/${id}/`)
      setStatus('')
    } catch (error) {
      state.currentId = null
      setStatus(error instanceof Error ? error.message : 'Could not load the report.', true)
    }
  }

  const closeDetail = (push = true): void => {
    state.currentId = null
    if (dialog.open) dialog.close()
    if (push) window.history.pushState({}, '', `${BASE}reports/`)
  }

  desktopLayout.addEventListener('change', syncBattleDetails)
  form.addEventListener('submit', (event) => event.preventDefault())
  let timer: number | undefined
  form.addEventListener('input', () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      state.filters = readFilters()
      syncUrl()
      void loadPage(true)
    }, 250)
  })
  form.addEventListener('change', () => {
    state.filters = readFilters()
    syncUrl()
    void loadPage(true)
  })
  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      state.filters = {}
      syncUrl()
      void loadPage(true)
    }, 0)
  })
  loadMore.addEventListener('click', () => void loadPage(false))
  const refresh = must<HTMLButtonElement>(root, '[data-report-refresh]')
  refresh.addEventListener('click', () => {
    void loadMeta()
    void loadStats()
    void loadPage(true)
  })

  list.addEventListener('click', (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-report-id]')
    if (card?.dataset['reportId']) void openDetail(card.dataset['reportId'])
  })

  closeButton.addEventListener('click', () => closeDetail())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDetail()
  })
  dialog.addEventListener('close', () => {
    if (state.currentId) closeDetail(false)
  })
  detailRoot.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const copy = target.closest<HTMLElement>('[data-copy-link]')
    if (copy && state.currentId) {
      const link = `${window.location.origin}${BASE}reports/${state.currentId}/`
      void navigator.clipboard?.writeText(link).then(() => {
        copy.textContent = 'Copied'
        window.setTimeout(() => {
          copy.textContent = 'Copy link'
        }, 1200)
      })
      return
    }
    const toggle = target.closest<HTMLElement>('[data-battle-details-toggle]')
    if (toggle) {
      const panel = detailRoot.querySelector<HTMLElement>('[data-battle-details]')
      if (!panel) return
      const expanded = toggle.getAttribute('aria-expanded') === 'true'
      toggle.setAttribute('aria-expanded', String(!expanded))
      toggle.textContent = expanded ? 'Battle Details' : 'Hide Battle Details'
      panel.hidden = expanded
    }
  })

  window.addEventListener('popstate', () => {
    const id = parsePathId()
    if (id) {
      void openDetail(id, false)
    } else {
      closeDetail(false)
    }
  })

  setFormValues()
  const initialId = parsePathId() || new URLSearchParams(window.location.search).get('id')
  void loadMeta()
  void loadStats()
  void loadPage(true)
  if (initialId) void openDetail(initialId, false)
}
