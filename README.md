# WoS Util Site

Static website for [WoS Util](https://github.com/marioocm/wosutil) — a rally countdown timer with rally/enemy callers, call queue, shareable setup and a live UTC clock, a battle simulator with generation presets, Hero Comparison, Joiners, Troop Power, Stats Bonuses and simulated battle reports, and a browser for the public battle-report archive.

Live site: [wosutil.tech](https://wosutil.tech/)

## Features

- **Battle Reports:** searchable public battle archive with mode (rally / 1v1), generation, multi-hero (including no-heroes) and multi-joiner filters (with attacker/defender side), result, tier, FC and T12 filters, report details, JSON/CSV downloads and a full JSONL export.
- **Countdown:** duration-based timer, rally and enemy callers, call queue, shareable setup and UTC clock.
- **Simulator:** generation presets, Hero Comparison, Joiners, Troop Power and Stats Bonuses, plus Battle Overview and Battle Details from the `wosutil-sim` engine.
- **Optimise Ratio:** sweeps one side's inf/lan/mar split on the engine and lists the best ratios; click a result to apply it to Troop Power.
- Static Astro pages with scoped vanilla-TS scripts; the countdown needs no backend.

## Stack

- [Astro](https://astro.build/) 7 — static output, file-based routing and prefetch
- [TypeScript](https://www.typescriptlang.org/) 7
- [Tailwind CSS](https://tailwindcss.com/) v4 — CSS-first config via `@theme`
- [Vitest](https://vitest.dev/) 5 — unit tests
- [pnpm](https://pnpm.io/) 10 - package manager
- Rust → WebAssembly - the battle engine and ratio optimiser in a Web Worker
- Cloudflare Pages - static hosting at `wosutil.tech`
- Cloudflare Tunnel + FastAPI/SQLite - the reports API at `api.wosutil.tech`

## Requirements

- Node.js 24+ (matches CI)
- pnpm 10+

## Local development

```sh
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:4321/`.

## Simulator engine

The simulator runs the Rust engine **in the browser** (`src/lib/engine/`):
`wosutil-sim` compiles it to wasm and the page loads it in a Web Worker. There
is no simulator API call, no `/sim` route and no server-side simulation.

- Simulate sends 4096 seeds to the worker; Optimise Ratio runs the same search
  in Rust (10% coarse grid, 512 final seeds).
- Generation presets are bundled in `src/data/generation-presets.json`; refresh
  them with `pnpm refresh:presets` when a new generation is published.
- The reports archive still uses the read-only API. Its base is `/api` by
  default and can be changed with `PUBLIC_REPORTS_API` or a cross-origin URL.

## Checks

```sh
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest
pnpm build       # production build -> dist/
pnpm preview     # preview the production build
```

## Structure

- `src/pages/` — routes: countdown, simulator, reports, 404 and `robots.txt`.
- `src/layouts/` — document shell (`BaseLayout`) and site chrome (`SiteLayout`).
- `src/components/` — static header/footer, the countdown widgets and the shared hero visual helper.
- `src/scripts/` — browser behavior: countdown island, header chrome, simulator cards, simulation results and the reports browser.
- `src/lib/` — shared logic and types, with Vitest tests (timer, rally, heroes, generations, troop power, stats, simulation and reports); `src/lib/engine/` holds the wasm worker and client.
- `src/styles/` — Tailwind entry and design tokens.
- `public/` — favicon and static assets.
- `docs/DESIGN.md` — design system.
- `astro.config.ts` — static config, base/site, root redirect, sitemap and prefetch.

## Deployment

The site is hosted on **Cloudflare Pages** as `wosutil.tech` (and `www`):

```sh
pnpm dlx wrangler@latest login   # one time
pnpm deploy:pages
```

`deploy:pages` builds with `SITE_URL=https://wosutil.tech`,
`BASE_PATH=/` and `PUBLIC_REPORTS_API=https://api.wosutil.tech/api`, then
uploads `dist/` to the `wosutil-site` Pages project. The reports API stays on
`https://api.wosutil.tech/api`; the simulator runs entirely in the browser.

GitHub Actions only runs typecheck, tests and builds; it does not deploy the
site. The Astro `base`/`site` still derive from `GITHUB_REPOSITORY` for forks;
override them with `BASE_PATH`/`SITE_URL`. The root URL redirects to
`/reports/`.

## Design and contributing

- Design system: [docs/DESIGN.md](docs/DESIGN.md).
- Architecture, quirks and commit conventions: [AGENTS.md](AGENTS.md).

## License

MIT — see [LICENSE](LICENSE).
