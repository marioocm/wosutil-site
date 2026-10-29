# AGENTS.md

## Project
Static website for WoS Util (Whiteout Survival utility): a countdown timer page. Open source (MIT), deployed to GitHub Pages. Stack: Vite + TypeScript + Tailwind CSS v4, package manager: pnpm.

## Structure
- `index.html` → redirects to the countdown page (GitHub Pages root URL); `public/404.html` → same redirect for unknown URLs (served by GitHub Pages, copied from `public/` into `dist/`)
- `countdown/index.html` → the countdown page (Vite multi-page build)
- `src/main.ts` → entry point, DOM wiring, timer state machine
- `src/timer.ts` → pure helpers: time splitting, clamping, input parsing, UTC clock (unit-tested with Vitest)
- `src/redirect.ts` → root-relative countdown redirect: probes candidate paths so the redirect works from any URL (dev server, Pages subpath, forks). `index.html` imports it; `public/404.html` inlines a copy (can't be bundled). Unit-tested with Vitest.
- `src/theme.ts` → light/dark theme resolution, persistence (`wosutil:theme`) and the top-right toggle. Unit-tested with Vitest.
- `src/style.css` → Tailwind entry; `src/styles/theme.css` → design tokens (`@theme`, light/dark CSS variables)
- `docs/DESIGN.md` → design system reference (monochrome cream/ink palette, outlined cards, small radii, minimalist labels). **Read it before touching UI.**
- `.github/workflows/ci.yml` → typecheck, tests, build on every push/PR
- `.github/workflows/deploy.yml` → build + publish to GitHub Pages on main

## Key quirks
- Vite multi-page build: root `index.html` (redirect) + `countdown/index.html`, declared in `vite.config.ts` (`build.rollupOptions.input`).
- `base: './'` in `vite.config.ts` → relative asset paths, works on the Pages subpath and on forks.
- Tailwind v4 CSS-first config: tokens in `src/styles/theme.css` (`@theme`). No `tailwind.config.js`.
- Named spacing tokens (`--spacing-md: 12px`, …) collide with size utilities: `max-w-md` resolves to 12px, not 28rem. Always use arbitrary values for max-widths (e.g. `max-w-[34rem]`).
- Theme: light **and** dark. The page follows `prefers-color-scheme` by default; the top-right toggle (`theme-toggle`) overrides it and persists the choice in `localStorage` (`wosutil:theme`). `countdown/index.html` runs a tiny inline script before the stylesheet to avoid a flash of the wrong theme; `src/theme.ts` wires the toggle.
- Semantic colors are CSS variables mapped through `@theme inline` (`--color-background`, `--color-paper`, `--color-ink`, …). Light values live in `:root`, dark values in `.dark`; use these tokens instead of raw hex values in components.
- Fonts: Instrument Sans + Geist Mono, loaded from Google Fonts in `countdown/index.html`. Do not add proprietary fonts or copy Suisse Int'l — it requires a commercial license.
- Visual language: warm cream canvas, hairline outlined cards (no shadows), small radii (≤8px on cards, 4px on controls/rows), tight fluid headings, and monospace only for times/UTC. Keep the UI monochrome (ink/paper/tint); no colored accents or decorative labels/dots.
- The timer is duration-based (MM:SS display): the user enters minutes/seconds (`minutes-input`, `seconds-input` in `countdown/index.html`) and presses Play. State machine in `src/main.ts`: `configuredSeconds`, `remainingMs`, `running`, `finished`, `endTime`.
- Countdown runs drift-free: it stores `endTime` and recomputes `remainingMs` from `Date.now()` on a 250ms tick, instead of decrementing each second.
- Inputs are disabled while running; Reset restores the configured duration; Clear empties everything.
- The page also shows the current UTC time in a badge at the top-right corner (`utc-clock`, "UTC: HH:MM:SS"), updated every tick. Header layout: logo top-left; UTC clock, theme toggle and Share pill top-right.
- Drawer/panels: `rally-panel`, `enemy-panel` and `rally-queue` are outlined cards. Selected rows use a neutral tint with an ink border; running/flashing queue rows invert to ink/background. No color-coded accents.
- Single page today; when adding pages, extract shared UI (nav, footer, theme toggle) into `src/components/` as TS render functions imported by each page's entry.

## Commands
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test` (watch: `pnpm test:watch`)
- Build: `pnpm build` (output `dist/`, preview: `pnpm preview`)

## Definition of done
A change is ready to merge only when: `pnpm typecheck`, `pnpm test` and `pnpm build` all pass locally, and the built output in `dist/` was sanity-checked (redirects, countdown renders).

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