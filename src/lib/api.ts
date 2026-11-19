const DEFAULT_LOCAL_API = 'http://localhost:8000'
const DEFAULT_PUBLIC_API = '/sim'

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

function isLocalBase(base: string): boolean {
  try {
    const host = new URL(base).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}

export function resolveApiBase(): string {
  const query = new URLSearchParams(window.location.search).get('api')
  const configured = import.meta.env.PUBLIC_SIM_API
  const fallback = isLocalHost() ? DEFAULT_LOCAL_API : DEFAULT_PUBLIC_API
  // Ignore a baked localhost URL on the public host: it would make the
  // browser ask for local-network access to the visitor's own machine.
  const useConfigured = Boolean(configured) && (!isLocalBase(configured as string) || isLocalHost())
  return (query || (useConfigured ? (configured as string) : fallback)).replace(/\/+$/, '')
}
