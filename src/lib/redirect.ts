export const DEFAULT_SECTION = 'simulator'
export const DEFAULT_PAGE_MARKER = 'id="simulator"'

export function defaultRedirectPaths(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean)
  const paths: string[] = []
  for (let i = segments.length; i >= 0; i--) {
    const base = segments.slice(0, i).join('/')
    paths.push('/' + (base ? base + '/' : '') + DEFAULT_SECTION + '/')
  }
  return paths
}

export function isDefaultPage(html: string): boolean {
  return html.includes(DEFAULT_PAGE_MARKER)
}

export function redirectToDefault(): void {
  const paths = defaultRedirectPaths(window.location.pathname)
  let index = 0

  const tryNext = (): void => {
    if (index >= paths.length) return
    const url = window.location.origin + paths[index++]
    fetch(url, { cache: 'no-store' })
      .then((response) => (response.ok ? response.text() : ''))
      .then((html) => {
        if (isDefaultPage(html)) {
          window.location.replace(url)
        } else {
          tryNext()
        }
      })
      .catch(tryNext)
  }

  tryNext()
}
