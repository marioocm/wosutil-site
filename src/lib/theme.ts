export const THEME_STORAGE_KEY = 'wosutil:theme'

export type Theme = 'light' | 'dark'

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

export function resolveInitialTheme(stored: string | null): Theme {
  return isTheme(stored) ? stored : 'dark'
}

export function toggleTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'dark' ? '#151311' : '#f3eee3'
}

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage unavailable: the theme still applies for this session.
  }
}

export function mountThemeToggle(button: HTMLButtonElement): void {
  let theme = resolveInitialTheme(readStoredTheme())

  const sync = (): void => {
    const target = toggleTheme(theme)
    button.setAttribute('aria-label', `Switch to ${target} theme`)
    button.title = `Switch to ${target} theme`
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false')
  }

  applyTheme(theme)
  sync()

  button.addEventListener('click', () => {
    theme = toggleTheme(theme)
    applyTheme(theme)
    storeTheme(theme)
    sync()
  })
}
