/**
 * Refresh the presets bundled with the static site.
 *
 * The simulator no longer calls the Python API at runtime; generation presets
 * are a build artefact.  Run this when the defense-meta report publishes a new
 * generation, then commit the updated JSON:
 *
 *   pnpm refresh:presets
 *
 * The API must be reachable (default http://localhost:8000, override with
 * SIM_API or PUBLIC_SIM_API).
 */

import { writeFile } from 'node:fs/promises'

const base = (
  process.env['SIM_API'] ??
  process.env['PUBLIC_SIM_API'] ??
  'http://localhost:8000'
).replace(/\/+$/, '')

const response = await fetch(`${base}/v1/presets`, {
  headers: { Accept: 'application/json' },
})
if (!response.ok) {
  throw new Error(`Preset API error ${response.status}`)
}
const payload = await response.json()
const out = new URL('../src/data/generation-presets.json', import.meta.url)
await writeFile(out, JSON.stringify(payload) + '\n', 'utf8')
console.log(`Wrote ${out.pathname} (${payload.generations?.length ?? 0} generations)`)
