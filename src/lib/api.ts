const DEFAULT_API = 'http://localhost:8000'

export function resolveApiBase(): string {
  const query = new URLSearchParams(window.location.search).get('api')
  const configured = import.meta.env.PUBLIC_SIM_API
  return (query || configured || DEFAULT_API).replace(/\/+$/, '')
}
