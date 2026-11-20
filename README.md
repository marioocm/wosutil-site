# WoS Util Site

Static website for [WoS Util](https://github.com/marioocm/wosutil) — a rally countdown timer with rally/enemy callers, call queue, shareable setup and a live UTC clock, a battle simulator with generation presets, Hero Comparison, Joiners, Troop Power, Stats Bonuses and simulated battle reports, and a browser for the public battle-report archive.

Live site: [wosutil.mariocm.dev](https://wosutil.mariocm.dev/)

## Features

- **Battle Reports:** searchable public battle archive with generation, hero, joiner, result, tier, FC and T12 filters, report details, JSON/CSV downloads and a full JSONL export.
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
- Docker + Nginx - the published static image
- GitHub Actions + GHCR + Watchtower - CI and automatic container updates on the PC Caddy stack

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
- Production uses the same-origin `/sim` path served by the PC Caddy stack;
  the deploy workflow sets `PUBLIC_SIM_API=/sim`.
- The browser ignores a baked `localhost` API on a public host, so a local
  build cannot ask visitors for local-network access.
- The API's origin must be allowed in `WOS_CORS_ORIGINS` when it is called
  cross-origin. The same-origin `/sim` path needs no CORS entry.
- The API allows 5 simulations per 10s. The site mirrors that limit client-side
  and shows a friendly retry message when it is reached.
- Optimise Ratio uses `POST /v1/optimize-ratio` with the same case and a
  `side` (`att`/`def`); the response is the current split plus ranked
  candidates. Clicking a candidate writes its counts into Troop Power.

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
- `src/lib/` — shared logic and types, with Vitest tests (timer, rally, heroes, generations, troop power, stats, simulation, rate limit and reports).
- `src/styles/` — Tailwind entry and design tokens.
- `public/` — favicon and static assets.
- `docs/DESIGN.md` — design system.
- `astro.config.ts` — static config, base/site, root redirect, sitemap and prefetch.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`. The workflow verifies the
site and publishes `ghcr.io/marioocm/wosutil-site:latest`; the PC stack in
`wosutil-sim` pulls that image with Watchtower and restarts the web container.
Caddy serves the container through the Cloudflare Tunnel. No runner, Node
installation or host web directory is needed on the PC.

The image is built with `SITE_URL=https://wosutil.mariocm.dev`, `BASE_PATH=/`
and `PUBLIC_SIM_API=/sim`. GitHub Pages is disabled; the domain points at the
PC.

The Astro `base`/`site` still derive from `GITHUB_REPOSITORY` for forks;
override them with `BASE_PATH`/`SITE_URL`. The root URL redirects to
`/reports/`.

Build and run the image locally:

```sh
docker build -t ghcr.io/marioocm/wosutil-site:local .
docker run --rm -p 8090:8080 ghcr.io/marioocm/wosutil-site:local
```

## Design and contributing

- Design system: [docs/DESIGN.md](docs/DESIGN.md).
- Architecture, quirks and commit conventions: [AGENTS.md](AGENTS.md).

## License

MIT — see [LICENSE](LICENSE).
