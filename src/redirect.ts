export const COUNTDOWN_MARKER = 'id="utc-clock"'

export function countdownRedirectPaths(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean)
  const paths: string[] = []
  for (let i = segments.length; i >= 0; i--) {
    const base = segments.slice(0, i).join('/')
    paths.push('/' + (base ? base + '/' : '') + 'countdown/')
  }
  return paths
}

export function isCountdownPage(html: string): boolean {
  return html.includes(COUNTDOWN_MARKER)
}

export function redirectToCountdown(): void {
  const paths = countdownRedirectPaths(window.location.pathname)
  let index = 0

  const tryNext = (): void => {
    if (index >= paths.length) return
    const url = window.location.origin + paths[index++]
    fetch(url, { cache: 'no-store' })
      .then((response) => (response.ok ? response.text() : ''))
      .then((html) => {
        if (isCountdownPage(html)) {
          window.location.replace(url)
        } else {
          tryNext()
        }
      })
      .catch(tryNext)
  }

  tryNext()
}