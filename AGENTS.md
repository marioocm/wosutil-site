# AGENTS.md

## Project
Static website for WoS Util (Whiteout Survival utility): a rally countdown and a battle simulator. Open source (MIT), deployed to GitHub Pages. Stack: Astro 7 (static output) + TypeScript 7 + Tailwind CSS v4, Vitest 5. Package manager: pnpm 10; CI uses Node 24.

## Structure
- `astro.config.ts` — static Astro config: `site`/`base` derived from `GITHUB_REPOSITORY` (overridable with `SITE_URL`/`BASE_PATH`), root redirect, sitemap, prefetch and the Tailwind Vite plugin.
- `src/layouts/` — `BaseLayout.astro` (document shell, SEO/OG, fonts, theme init, optional countdown head script) and `SiteLayout.astro` (static header/footer chrome and the `#app` wrapper).
- `src/components/` — static header/footer, the vanilla-TS countdown widgets and the shared hero visual helper.
- `src/pages/` — `countdown.astro`, `simulator.astro`, redirecting `404.astro` and generated `robots.txt`.
- `src/scripts/` — page-scoped browser behavior: countdown island, site chrome, hero/joiner pickers, generation preset, troop power, stats and simulation results.
- `src/lib/` — shared logic, types and Vitest tests. Key modules: countdown/rally helpers, hero data and stats, generations, troop-power and stat math, simulation case builder/formatter, rate limit, redirect/nav/theme.
- `src/styles/` — Tailwind entry (`global.css`) and design tokens (`theme.css`).
- `docs/DESIGN.md` — design system source of truth for layout, color, typography, components and motion. **Read it before touching UI.**
- `public/.nojekyll` — required so GitHub Pages serves Astro's `_astro/` assets; `public/favicon.svg`.
- `.github/workflows/` — `ci.yml` (typecheck, tests and build on pushes/PRs) and `deploy.yml` (build and Pages deploy on `main`).

## Key quirks
- Static output only (`output: 'static'`, no adapter/SSR). `base` is `/<repo>/` for project pages and `/` for user sites/forks; relative nav links (`../<section>/`) keep forks working. The root redirect lives in `astro.config.ts`; `src/pages/404.astro` probes candidate simulator paths via `src/lib/redirect.ts`.
- Site chrome is static Astro markup; behavior is in `src/scripts/site-chrome.ts`. New sections: add a `NAV_ITEMS` entry in `src/lib/nav.ts`, a page using `SiteLayout` with the matching `active` value, and a page script only if interactive.
- Navigation is full-page (no ClientRouter; `prefetch: true`). The countdown island is included only on the countdown page through `BaseLayout`'s `countdown` prop and is not shipped to the simulator.
- Share reveal/exit crosses pages via the `wosutil:share-exit` event and `--share-shift` (`SiteHeader.astro` + `site-chrome.ts`); the visual spec lives in DESIGN.md.
- `#rally-panel`, `#enemy-panel` and `#rally-queue` have CSS `min-height` reservations in `src/styles/global.css` to keep CLS at 0; update them if those layouts change. `scrollbar-gutter: stable` on `html` prevents horizontal shift.
- Countdown is duration-based (MM:SS). Inputs are disabled while running; Reset restores the configured duration and Clear empties it. It stores `endTime` and recomputes `remainingMs` from `Date.now()` on a 250ms tick, so it is drift-free.
- The simulator is the default route (root redirect and 404 probe). Generation presets (`src/lib/generations.ts`) overwrite heroes, troops and stats on every change and reset T12 skills; the `wosutil:generation-change` event connects the selector with the page widgets.
- The Simulate button posts 1024 seeds to the engine API (`POST /v1/simulate`) at `http://localhost:8000`; override with `PUBLIC_SIM_API` at build time or `?api=...` in the URL. Each run sends a fresh `seed_base` so repeat clicks resample the battle. Hero skill levels are fixed at 5 in `src/lib/simulation.ts`; T12 levels come from Troop Power.
- Optimise Ratio posts the same case to `POST /v1/optimize-ratio` (`side: att|def`, 5% coarse grid, 256 final seeds) with a fresh `seed_base` per run. `buildOptimizeCase` keeps zero-count classes so their tier/FC can receive troops; clicking a result writes the three counts through the Troop Power inputs. Its results reveal with the same 220ms height motion as the Simulation card and show `seeds · elapsed_ms` plus a Ratio / Win % / Margin table.
- The API allows 5 simulations per 10s. Cloudflare sends 429 responses without CORS headers, so the browser only sees a `TypeError`; `src/lib/rate-limit.ts` mirrors the limit client-side.
- Hero portraits are hotlinked from the Whiteout Survival Wiki (`src/lib/hero-images.ts`); no game art is stored in this MIT-licensed repository. `src/lib/heroes.ts` owns the combat roster.
- Tailwind v4 is CSS-first (`@theme` in `src/styles/theme.css`, no `tailwind.config.js`). Named spacing tokens collide with size utilities: `max-w-md` resolves to 12px, so use arbitrary values (e.g. `max-w-[34rem]`).
- Fonts are self-hosted Fontsource files with custom `@font-face` in `BaseLayout.astro` (`font-display: optional`; primary latin subset preloaded). Do not add Google Fonts, proprietary fonts or copied Suisse Int'l (commercial license).
- `pnpm typecheck` is `tsc --noEmit`, not `astro check`: Astro 7's checker currently refuses TypeScript 7. Keep `.astro` templates thin and let `pnpm build` validate them.
- SEO: per-page title/description, canonical + Open Graph in `BaseLayout.astro`, sitemap, generated `robots.txt`, and `noindex` on redirect/404 pages.

## Commands
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test` (watch: `pnpm test:watch`)
- Build: `pnpm build` (output `dist/`; preview: `pnpm preview`)

## Definition of done
`pnpm typecheck`, `pnpm test` and `pnpm build` must pass locally, and `dist/` must be sanity-checked (root redirect, 404 redirect, both pages render, nav/theme/timer/share work).

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
