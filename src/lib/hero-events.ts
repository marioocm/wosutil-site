import type { TroopType } from './heroes'

export type HeroChangeSide = 'left' | 'right'

export interface HeroChangeDetail {
  side: HeroChangeSide
  type: TroopType
  previousId: string | null
  heroId: string | null
}

export const HERO_CHANGE_EVENT = 'wosutil:hero-change'

export function dispatchHeroChange(detail: HeroChangeDetail): void {
  document.dispatchEvent(new CustomEvent<HeroChangeDetail>(HERO_CHANGE_EVENT, { detail }))
}

export function onHeroChange(listener: (detail: HeroChangeDetail) => void): void {
  document.addEventListener(HERO_CHANGE_EVENT, (event) => {
    const detail = (event as CustomEvent<HeroChangeDetail>).detail
    if (!detail || !detail.side || !detail.type) return
    listener(detail)
  })
}
