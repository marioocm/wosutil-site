# WoS Util Site

Static website for [WoS Util](https://github.com/marioocm/wosutil) — a rally countdown timer with rally/enemy callers, call queue, shareable setup and a live UTC clock, plus a battle simulator with generation presets, Hero Comparison, Joiners, Troop Power, Stats Bonuses and simulated battle reports.

Live site: [marioocm.github.io/wosutil-site](https://marioocm.github.io/wosutil-site/)

## Features

- **Countdown:** duration-based timer, rally and enemy callers, call queue, shareable setup and UTC clock.
- **Simulator:** generation presets, Hero Comparison, Joiners, Troop Power and Stats Bonuses, plus Battle Overview and Battle Details from the `wosutil-sim` engine.
- Static Astro pages with scoped vanilla-TS scripts; the countdown needs no backend.

## Stack

- [Astro](https://astro.build/) 7 — static output, file-based routing and prefetch
- [TypeScript](https://www.typescriptlang.org/) 7
- [Tailwind CSS](https://tailwindcss.com/) v4 — CSS-first config via `@theme`
- [Vitest](https://vitest.dev/) 5 — unit tests
- [pnpm](https://pnpm.io/) 10 — package manager
- GitHub Pages + GitHub Actions — CI/CD

## Requirements

- Node.js 24+ (matches CI)
- pnpm 10+

## Local development

```sh
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:4321/`.

## Simulator API

The simulator page calls the `wosutil-sim` engine API. The local default is
`http://localhost:8000`; run the API with `docker compose up -d --build` in the
sibling `wosutil-sim` repository.

- Local override without rebuilding: `?api=http://192.168.1.50:8000`.
- Build-time override: copy `.env.example` to `.env` and set `PUBLIC_SIM_API`.
- Production: set the repository variable `PUBLIC_SIM_API` (Settings → Secrets
  and variables → Actions → Variables). The value is public and ends up in the
  browser bundle, so never put secrets in a `PUBLIC_*` variable.
- The API must be HTTPS when the site is served over HTTPS (GitHub Pages), and
  its origin must be allowed in the API's `WOS_CORS_ORIGINS`.
- The API allows 5 simulations per 10s. The site mirrors that limit client-side
  and shows a friendly retry message when it is reached.

## Checks

```sh
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest
pnpm build       # production build -> dist/
pnpm preview     # preview the production build
```

## Structure

- `src/pages/` — routes: countdown, simulator, 404 and `robots.txt`.
- `src/layouts/` — document shell (`BaseLayout`) and site chrome (`SiteLayout`).
- `src/components/` — static header/footer, the countdown widgets and the shared hero visual helper.
- `src/scripts/` — browser behavior: countdown island, header chrome, simulator cards and simulation results.
- `src/lib/` — shared logic and types, with Vitest tests (timer, rally, heroes, generations, troop power, stats, simulation and rate limit).
- `src/styles/` — Tailwind entry and design tokens.
- `public/` — `.nojekyll` (required for Astro's `_astro/` assets on Pages) and favicon.
- `docs/DESIGN.md` — design system.
- `astro.config.ts` — static config, base/site, root redirect, sitemap and prefetch.

## Deployment

GitHub Actions builds and publishes `dist/` to GitHub Pages on `main`. The Astro `base`/`site` are derived from `GITHUB_REPOSITORY`, so project pages and forks work without editing the config; override them with `BASE_PATH`/`SITE_URL` if needed. The root URL redirects to `/simulator/`.

## Design and contributing

- Design system: [docs/DESIGN.md](docs/DESIGN.md).
- Architecture, quirks and commit conventions: [AGENTS.md](AGENTS.md).

## License

MIT — see [LICENSE](LICENSE).
