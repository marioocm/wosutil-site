/**
 * Build the static site and publish it to Cloudflare Pages.
 *
 * Requires a one-time `pnpm dlx wrangler@latest login` and the existing
 * `wosutil-site` Pages project. The API stays at https://api.wosutil.tech/api.
 */

import { execFileSync } from 'node:child_process'

const env = {
  ...process.env,
  PUBLIC_REPORTS_API: 'https://api.wosutil.tech/api',
}

function run(args) {
  const pnpmCli = process.env['npm_execpath']
  if (pnpmCli) {
    execFileSync(pnpmCli, args, { stdio: 'inherit', env })
    return
  }
  execFileSync('pnpm', args, { stdio: 'inherit', env, shell: true })
}

run(['build'])
run([
  'dlx',
  'wrangler@latest',
  'pages',
  'deploy',
  'dist',
  '--project-name',
  'wosutil-site',
  '--branch',
  'main',
  '--commit-dirty=true',
])
