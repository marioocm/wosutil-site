export const NAV_ITEMS = [
  { section: 'reports', label: 'Battle Reports', href: '/reports/' },
  { section: 'countdown', label: 'Countdown', href: '/countdown/' },
  { section: 'simulator', label: 'Simulator', href: '/simulator/' },
] as const

export type SiteSection = (typeof NAV_ITEMS)[number]['section']
