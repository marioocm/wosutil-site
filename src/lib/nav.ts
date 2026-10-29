export const NAV_ITEMS = [
  { section: 'simulator', label: 'Simulator', href: '../simulator/' },
  { section: 'countdown', label: 'Countdown', href: '../countdown/' },
] as const

export type SiteSection = (typeof NAV_ITEMS)[number]['section']
