# AGENTS.md

## Project
Static website for WoS Util (Whiteout Survival utility): a rally countdown page and a battle simulator (in development). Open source (MIT), deployed to GitHub Pages. Stack: Astro 7 (static output) + TypeScript + Tailwind CSS v4, package manager: pnpm.

## Structure
- `astro.config.ts` → static Astro config: `site`/`base` derived from `GITHUB_REPOSITORY` (overridable with `SITE_URL`/`BASE_PATH`), root redirect (`redirects`), sitemap, prefetch and the Tailwind Vite plugin.
- `src/layouts/BaseLayout.astro` → document shell: head, SEO/OG/canonical, theme init script, Fontsource `?url` files with custom `@font-face`, global CSS and the optional countdown head script (`countdown` prop).
- `src/layouts/SiteLayout.astro` → site chrome: static header/footer, the `#app` wrapper (`data-page`) and the `site-chrome` client script.
- `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro` → static chrome markup (nav, UTC clock, theme toggle, Share, GitHub footer).
- `src/components/rally-callers.ts`, `src/components/rally-queue.ts`, `src/components/duration-input.ts` → imperative vanilla-TS widgets used by the countdown island.
- `src/pages/countdown.astro`, `src/pages/simulator.astro` → pages; `src/pages/404.astro` → redirecting 404; `src/pages/robots.txt.ts` → generated `robots.txt`.
- `src/scripts/countdown.ts` → countdown island: DOM wiring, timer state machine, rally/queue/share behavior.
- `src/scripts/site-chrome.ts` → header behavior: UTC clock, theme toggle, nav indicator, share reveal/exit animation, mobile auto-hide.
- `src/scripts/stat-bonuses.ts` → simulator stats table: live comparison, two-decimal formatting on blur and the hidden summary.
- `src/lib/timer.ts`, `share.ts`, `rally-selection.ts`, `rally-callers.ts`, `stat-bonuses.ts`, `theme.ts`, `redirect.ts`, `nav.ts` → shared logic and types; pure helpers are unit-tested with Vitest.
- `src/styles/global.css` → Tailwind entry + small global component CSS; `src/styles/theme.css` → design tokens (`@theme`, light/dark CSS variables).
- `public/.nojekyll` → required so GitHub Pages serves Astro's `_astro/` assets; `public/favicon.svg`.
- `docs/DESIGN.md` → design system reference and source of truth for layout, color, type, header/panel behavior and motion. **Read it before touching UI.**
- `.github/workflows/ci.yml` → typecheck, tests, build on every push/PR
- `.github/workflows/deploy.yml` → build + publish to GitHub Pages on main

## Key quirks
- Astro static output (`output: 'static'`, no adapter/SSR). `base` is computed from `GITHUB_REPOSITORY` (project site → `/<repo>/`, user site → `/`) and `site` from the repository owner; override with `BASE_PATH`/`SITE_URL`. Local dev/build fall back to `/` and the official site URL. Relative nav links (`../<section>/`) keep forks working.
- The root redirect is configured in `astro.config.ts` (`redirects: { '/': base + 'countdown/' }`) and generated as a static meta-refresh page. `src/pages/404.astro` uses `src/lib/redirect.ts` to probe candidate countdown paths so unknown URLs redirect correctly on any Pages subpath or fork.
- Site chrome is static Astro markup; behavior lives in `src/scripts/site-chrome.ts`. No JS-rendered header/footer. New sections: add a `NAV_ITEMS` entry in `src/lib/nav.ts`, a `src/pages/<section>.astro` using `SiteLayout`, and a page script only if interactive. The active tab is passed per page (`active: 'countdown' | 'simulator'`).
- Navigation is full-page (no ClientRouter/SPA); `prefetch: true` prefetches links. Timer/state lifecycle stays simple: leaving countdown reloads and resets it.
- The countdown island is included only on the countdown page through `BaseLayout`'s `countdown` prop (a processed head script), so it loads early and is not shipped to the simulator. It is vanilla TS, no UI framework.
- The island hydrates into static card containers; `#rally-panel`, `#enemy-panel` and `#rally-queue` have CSS `min-height` reservations in `src/styles/global.css` to keep CLS at 0 while the widgets mount. Update those values if the form/queue layout changes.
- `scrollbar-gutter: stable` on `html` prevents the horizontal shift when the page grows past the viewport.
- Share animation: countdown load reveals the actions/share; leaving countdown sets `wosutil:share-exit` and the simulator page animates the exit (direct simulator loads stay hidden). Implemented with a CSS transform/`--share-shift` in `SiteHeader.astro`/`site-chrome.ts`; the visual spec lives in DESIGN.md. Navigation is still full-page.
- Tailwind v4 CSS-first config: tokens in `src/styles/theme.css` (`@theme`). No `tailwind.config.js`.
- Named spacing tokens (`--spacing-md: 12px`, …) collide with size utilities: `max-w-md` resolves to 12px, not 28rem. Always use arbitrary values for max-widths (e.g. `max-w-[34rem]`).
- Fonts: self-hosted Fontsource files with custom `@font-face` rules in `src/layouts/BaseLayout.astro` (`font-display: optional`; primary latin subset preloaded, mono not). Reloads are flash-free and CLS stays 0; a cold load may use the system fallback for that view. Do not add Google Fonts, proprietary fonts or copied Suisse Int'l — it requires a commercial license.
- The timer is duration-based (MM:SS display): the user enters minutes/seconds (`minutes-input`, `seconds-input` in `src/pages/countdown.astro`) and presses Play. State machine in `src/scripts/countdown.ts`: `configuredSeconds`, `remainingMs`, `running`, `finished`, `endTime`.
- Countdown runs drift-free: it stores `endTime` and recomputes `remainingMs` from `Date.now()` on a 250ms tick, instead of decrementing each second.
- Inputs are disabled while running; Reset restores the configured duration; Clear empties everything.
- The countdown page is the site default: the root redirect and the 404 probe both point there. `redirect.ts` detects the countdown page via the static `id="countdown"` marker.
- The simulator starts with the 12-row Stats Bonuses table: `STAT_BONUSES` in `src/lib/stat-bonuses.ts` defines the game order, `src/pages/simulator.astro` renders it and `src/scripts/stat-bonuses.ts` compares both sides live. Inputs are percentages with at most two decimals (extra decimals are blocked while typing and values are normalized to two decimals on blur); the higher side uses `--positive`, the lower side `--negative`, and ties/empty/invalid values stay neutral. The script is page-scoped, not shipped to the countdown.
- `pnpm typecheck` uses `tsc --noEmit`, not `astro check`: Astro 7's checker currently refuses TypeScript 7 (it asks for TS 6, or the experimental `@astrojs/ts-content-mapper` with TS 7.1+). Keep `.astro` templates thin and rely on `pnpm build` to validate them.
- SEO: per-page title/description, canonical + Open Graph in `BaseLayout.astro`, `@astrojs/sitemap`, generated `robots.txt`, and `noindex` on the redirect/404 pages.

## Commands
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test` (watch: `pnpm test:watch`)
- Build: `pnpm build` (output `dist/`, preview: `pnpm preview`)

## Definition of done
A change is ready to merge only when: `pnpm typecheck`, `pnpm test` and `pnpm build` all pass locally, and the built output in `dist/` was sanity-checked (root redirect, 404 redirect, both pages render, nav/theme/timer/share work).

## Git workflow
GitHub Flow: `main` is always deployable; all work happens on short-lived branches merged via Pull Requests (squash merge, branch deleted after merge).

### Branch naming
Prefix branches by change type:
- `feat/` — new functionality
- `fix/` — bug fixes
- `docs/` — documentation only (AGENTS.md, README, comments)
- `refactor/` — code changes that add no feature and fix no bug
- `style/` — formatting, whitespace, and other non-functional changes
- `test/` — tests only
- `ci/` — CI/CD, GitHub Actions, build tooling

### Commit message convention (Conventional Commits)
Format: `<type>(<scope optional>): <short description in imperative mood>` (first line ≤ 72 chars, no trailing period).

Types: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `chore`, `ci`.

Rules:
- Always write the description in English, in imperative mood ("add X", not "added X" or "X added").
- Keep commits atomic: one logical change per commit; split unrelated changes (e.g. `fix:` + `style:`) into separate commits.
- Add a body (blank line after header) only when the "why" matters; never restate the "how".
- Reference issues in the footer when applicable (`Closes #123`).

### Process
1. Before starting, update `main`: `git checkout main && git pull origin main`.
2. Create the branch: `git checkout -b <type>/<short-description>` (e.g. `feat/countdown-page`).
3. Commit in small increments using the conventions above.
4. Push the branch and open a Pull Request (even for solo work: it runs CI checks and forces a self-review of the diff).
5. Merge via squash, then delete the remote and local branches.

### CI
`.github/workflows/ci.yml` runs typecheck, tests and build on every push/PR. Agents must ensure checks pass before pushing; never merge a PR with failing checks.

Keep this file updated when the structure, commands or conventions change.
