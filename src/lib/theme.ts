export const THEME_STORAGE_KEY = 'wosutil:theme'

export type Theme = 'light' | 'dark'

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (isTheme(stored)) return stored
  return prefersDark ? 'dark' : 'light'
}

export function toggleTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
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
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  let theme = resolveInitialTheme(readStoredTheme(), media.matches)

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

  media.addEventListener('change', (event) => {
    if (isTheme(readStoredTheme())) return
    theme = resolveInitialTheme(null, event.matches)
    applyTheme(theme)
    sync()
  })
}
