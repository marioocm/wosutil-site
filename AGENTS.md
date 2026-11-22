# AGENTS.md

## Project
Static website for WoS Util (Whiteout Survival utility): a rally countdown and a battle simulator. Open source (MIT), deployed as a Docker image on the PC (`wosutil-sim` stack) through Cloudflare Tunnel. Stack: Astro 7 (static output) + TypeScript 7 + Tailwind CSS v4, Vitest 5. Package manager: pnpm 10; CI uses Node 24.

## Structure
- `astro.config.ts` — static Astro config: `site`/`base` derived from `GITHUB_REPOSITORY` (overridable with `SITE_URL`/`BASE_PATH`), root redirect, sitemap, prefetch and the Tailwind Vite plugin.
- `src/layouts/` — `BaseLayout.astro` (document shell, SEO/OG, fonts, theme init, optional countdown head script) and `SiteLayout.astro` (static header/footer chrome and the `#app` wrapper).
- `src/components/` — static header/footer, the vanilla-TS countdown widgets and the shared hero visual helper.
- `src/pages/` — `countdown.astro`, `simulator.astro`, redirecting `404.astro` and generated `robots.txt`.
- `src-app/` — desktop shell build (Astro `srcDir`): `pages/index.astro` (main shell) and `pages/templates.astro` (standalone Template Creator, opened only by `template-creator`).
- `src/scripts/` — page-scoped browser behavior: countdown island, site chrome, hero/joiner pickers, generation preset, troop power, stats, simulation results and the desktop shell client (`app/`, including the standalone template editor).
- `src/lib/` — shared logic, types and Vitest tests. Key modules: countdown/rally helpers, hero data and stats, API-backed generations, troop-power and stat math, simulation case builder/formatter, rate limit, redirect/nav/theme, shared API base resolution.
- `src/styles/` — Tailwind entry (`global.css`), desktop shell classes (`app.css`) and design tokens (`theme.css`).
- `scripts/package-ui.mjs` — copies the desktop shell build (main page and the standalone `templates/` page) into `dist/ui/` and writes its hashed `manifest.json`.
- `astro.app.config.ts` — desktop shell build (`base: '/'`, output `dist-app/`), separate from the public site build.
- `docs/DESIGN.md` — design system source of truth for layout, color, typography, components and motion. **Read it before touching UI.**
- `public/.nojekyll` — legacy GitHub Pages marker, harmless in the Docker/Nginx image; `public/favicon.svg`.
- `Dockerfile` — multi-stage Node build → `nginxinc/nginx-unprivileged` static image, exposed on container port 8080.
- `nginx.conf` — static serving with the reports-page fallback for report detail URLs and `_astro/` asset 404s.
- `.github/workflows/` — `ci.yml` (typecheck, tests and builds on pushes/PRs) and `deploy.yml` (verify + publish the GHCR image on `main`).

## Key quirks
- Static output only (`output: 'static'`, no adapter/SSR). `base` is `/<repo>/` for project pages and `/` for user sites/forks; relative nav links (`../<section>/`) keep forks working. The root redirect lives in `astro.config.ts`; `src/pages/404.astro` probes candidate reports paths via `src/lib/redirect.ts`.
- Site chrome is static Astro markup; behavior is in `src/scripts/site-chrome.ts`. New sections: add a `NAV_ITEMS` entry in `src/lib/nav.ts`, a page using `SiteLayout` with the matching `active` value, and a page script only if interactive.
- Navigation is full-page (no ClientRouter; `prefetch: true`). The countdown island is included only on the countdown page through `BaseLayout`'s `countdown` prop and is not shipped to the simulator.
- The `Share config` action lives in the Rally callers card header on the countdown page (not in the header/nav); it copies the current rally/enemy configuration link.
- `#rally-panel`, `#enemy-panel` and `#rally-queue` have CSS `min-height` reservations in `src/styles/global.css` to keep CLS at 0; update them if those layouts change. `scrollbar-gutter: stable` on `html` prevents horizontal shift.
- Countdown is duration-based (MM:SS). Inputs are disabled while running; Reset restores the configured duration and Clear empties it. It stores `endTime` and recomputes `remainingMs` from `Date.now()` on a 250ms tick, so it is drift-free.
- The reports archive is the default route (root redirect and 404 probe, `src/lib/redirect.ts`). The UI labels the two armies **Attacker** and **Defender** (the internal side keys stay `left`/`right`); widget and joiner roles follow those labels. Generation presets are fetched from the engine API (`GET /v1/presets`) on startup and overwrite heroes, troops, stats, T12 levels and buffs on every change. The API serves the raw stat panel plus the max city/pets/Gareth modifiers; `src/lib/stat-buffs.ts` applies `(100 + raw) * (1 + up/100) / (1 + down/100) - 100` when building the engine case, with city, pets and same-stat S4 widgets added in the numerator and the opponent's enemy debuffs plus Gareth in the denominator. The `wosutil:generation-change` event connects the selector with the page widgets. There is no static preset snapshot: if the API is unavailable the picker shows “Generation data unavailable”.
- Archive filters reuse the simulator's picker rows (`src/components/hero-option.ts`) for the hero and joiner dialogs; the generation trigger is a three-column `All gens` + Gen 1..N grid. Hero and joiner filters are repeated `hero`/`joiner` query params, each `name` or `name:side` (`any`/`attacker`/`defender`/`both`), ANDed together; the UI allows up to 6 heroes and 8 joiners, adds a new empty row while under the cap, shows a per-row side toggle (`both` requires the hero or joiner on both sides) and an X control that removes a selected row. `max_gen` is an upper bound enforced by the reports API against every main hero and joiner (epics and unknown names count as always available), not a "has this hero" match. `fc=0` matches troops with an empty furnace (no fire crystal), and cards/detail tiles render that as `FC0`. Result options with zero reports in `/v1/meta` are hidden, so `No wipe` is not offered. The reports API image must copy `src/wosutil_sim/hero_stats.py` because the generation map comes from `HERO_STATS` (`deploy/Dockerfile.reports` in `wosutil-sim`).
- Hero changes fire `wosutil:hero-change`; with “Sync hero stats” enabled (default) `src/scripts/stat-bonuses.ts` adds the old/new hero expedition-stat difference to that class's raw panel. The Stats Bonuses table shows the effective panel (raw + heroes + city/pets/Gareth + the side's current S4 widgets); raw values live in `data-raw-value`, so buff or widget changes rebuild the visible panel and manual edits invert the transform. The Buffs section toggles City (0/10/20), Pets (max) and Gareth (0-5%) per side, and a change on one side updates both sides because enemy debuffs affect the opponent.
- The API base defaults to `http://localhost:8000`; override with `PUBLIC_SIM_API` at build time or `?api=...` in the URL (`src/lib/api.ts`). The Simulate button posts 4096 seeds to `POST /v1/simulate`; each run sends a fresh `seed_base` so repeat clicks resample the battle. Hero skill levels are fixed at 5 in `src/lib/simulation.ts`; T12 levels come from the preset/Troop Power.
- Optimise Ratio posts the same case to `POST /v1/optimize-ratio` (`side: att|def`, 5% coarse grid, 256 final seeds) with a fresh `seed_base` per run. `buildOptimizeCase` keeps zero-count classes so their tier/FC can receive troops; clicking a result writes the three counts through the Troop Power inputs. Its results reveal with the same 220ms height motion as the Simulation card and show `seeds · elapsed_ms` plus a Ratio / Win % / Margin table.
- The API allows 5 simulations per 10s. Cloudflare sends 429 responses without CORS headers, so the browser only sees a `TypeError`; `src/lib/rate-limit.ts` mirrors the limit client-side.
- Hero portraits are hotlinked from the Whiteout Survival Wiki (`src/lib/hero-images.ts`); no game art is stored in this MIT-licensed repository. `src/lib/heroes.ts` owns the combat roster.
- Tailwind v4 is CSS-first (`@theme` in `src/styles/theme.css`, no `tailwind.config.js`). Named spacing tokens collide with size utilities: `max-w-md` resolves to 12px, so use arbitrary values (e.g. `max-w-[34rem]`).
- Fonts are self-hosted Fontsource files with custom `@font-face` in `BaseLayout.astro` (`font-display: optional`; primary latin subset preloaded). Do not add Google Fonts, proprietary fonts or copied Suisse Int'l (commercial license).
- `pnpm typecheck` is `tsc --noEmit`, not `astro check`: Astro 7's checker currently refuses TypeScript 7. Keep `.astro` templates thin and let `pnpm build` validate them.
- The desktop shell (`src-app/pages/index.astro`) is built with `astro.app.config.ts` (`srcDir: 'src-app'`, base `/`, output `dist-app/`) because WosUtil serves it from its own local root, not from the public site base. `scripts/package-ui.mjs` copies it to `dist/ui/` with a hashed `manifest.json`; that folder is the versioned UI artifact consumed by the WosUtil desktop client. The Template Creator (`src-app/pages/templates.astro`) is a separate page in the same bundle, opened only by the developer tool; it is not linked from the main shell. `uiVersion` is derived from the file hashes, so it only changes when the shell changes, not on every site deploy. Bump `apiVersion` in the manifest only for breaking API changes, together with `wosutil.ui.contract.API_VERSION` in the WosUtil repo.
- Shell development: run the WosUtil API with `WOSUTIL_UI_NO_WINDOW=1 WOSUTIL_UI_PORT=8765 WOSUTIL_UI_TOKEN=dev` (PowerShell: `$env:...`), then `pnpm dev:app` and open `http://localhost:4321/?t=dev`. The Vite proxy forwards `/api` (including SSE) to the Python server and edits hot-reload. Set `WOSUTIL_UI_URL=http://localhost:4321/?t=dev` to show that dev URL in the Edge app window instead of a normal browser tab.
- Public deployment is image-based: `.github/workflows/deploy.yml` publishes `ghcr.io/marioocm/wosutil-site:latest` on `main`, and the PC `wos-pc` Compose stack pulls it with Watchtower. There is no GitHub runner, Node install or live `deploy/web` directory on the PC. The image package must stay public so Watchtower can pull it anonymously; never add secrets to the image or workflow.
- SEO: per-page title/description, canonical + Open Graph in `BaseLayout.astro`, sitemap, generated `robots.txt`, and `noindex` on redirect/404 pages.

## Commands
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Desktop shell dev server: `pnpm dev:app` (proxies `/api` to `127.0.0.1:8765`; override with `WOSUTIL_API`)
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test` (watch: `pnpm test:watch`)
- Build: `pnpm build` (output `dist/`; preview: `pnpm preview`)
- Desktop shell: `pnpm build:app` (output `dist-app/`) and `pnpm package:ui` (output `dist/ui/`)

## Definition of done
`pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm build:app` and `pnpm package:ui` must pass locally, and `dist/` must be sanity-checked (root redirect, 404 redirect, both pages render, nav/theme/timer/share work).

## Git workflow
GitHub Flow: `main` is always deployable; all work happens on short-lived branches merged via Pull Requests (squash merge, branch deleted after merge).

### Branch naming
Prefix branches by change type: `feat/` (new functionality), `fix/` (bug fixes), `docs/` (documentation only), `refactor/` (no feature or bug fix), `style/` (formatting or other non-functional changes), `test/` (tests only), `ci/` (CI/CD and build tooling).

### Commit messages
Conventional Commits: `<type>(<scope optional>): <short description in imperative mood>` (first line ≤ 72 chars, no trailing period). Types: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `chore`, `ci`.
- Write the description in English, imperative mood ("add X", not "added X").
- Keep commits atomic; split unrelated changes (e.g. `fix:` + `style:`).
- Add a body only when the "why" matters; never restate the "how".
- Reference issues in the footer when applicable (`Closes #123`).

### Process
1. Update `main`: `git checkout main && git pull origin main`.
2. Create the branch: `git checkout -b <type>/<short-description>`.
3. Commit in small increments using the conventions above.
4. Push and open a Pull Request (even for solo work: CI plus self-review).
5. Merge via squash, then delete the remote and local branches.

### CI
`ci.yml` runs typecheck, tests and build on every push/PR. Ensure checks pass before pushing; never merge a PR with failing checks.

Keep this file updated when the structure, commands or conventions change.
