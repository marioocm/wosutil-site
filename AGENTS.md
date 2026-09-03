# AGENTS.md

## Project
Static website for WoS Util (Whiteout Survival utility): a countdown timer page. Open source (MIT), deployed to GitHub Pages. Stack: Vite + TypeScript + Tailwind CSS v4, package manager: pnpm.

## Structure
- `index.html` → redirects to `/countdown/` (GitHub Pages root URL); `public/404.html` → same redirect for unknown URLs (served by GitHub Pages, copied from `public/` into `dist/`)
- `countdown/index.html` → the countdown page (Vite multi-page build)
- `src/main.ts` → entry point, DOM wiring, timer state machine
- `src/timer.ts` → pure helpers: time splitting, clamping, input parsing, UTC clock (unit-tested with Vitest)
- `src/style.css` → Tailwind entry; `src/styles/theme.css` → design tokens (`@theme`)
- `docs/DESIGN.md` → design system reference (Supabase-inspired palette, typography, components). **Read it before touching UI.**
- `.github/workflows/ci.yml` → typecheck, tests, build on every push/PR
- `.github/workflows/deploy.yml` → build + publish to GitHub Pages on main

## Key quirks
- Vite multi-page build: root `index.html` (redirect) + `countdown/index.html`, declared in `vite.config.ts` (`build.rollupOptions.input`).
- `base: './'` in `vite.config.ts` → relative asset paths, works on the Pages subpath and on forks.
- Tailwind v4 CSS-first config: tokens in `src/styles/theme.css` (`@theme`). No `tailwind.config.js`.
- Design is light-only ("Theme: light" in `docs/DESIGN.md`); dark surfaces (`canvas-night`, `on-dark`) exist as tokens for contrast sections, no dark mode toggle yet.
- Font: Circular is proprietary → substituted with Inter (Google Fonts) via `--font-primary` override in `src/style.css`.
- The timer is duration-based (MM:SS display): the user enters minutes/seconds (`minutes-input`, `seconds-input` in `countdown/index.html`) and presses Play. State machine in `src/main.ts`: `configuredSeconds`, `remainingMs`, `running`, `finished`, `endTime`.
- Countdown runs drift-free: it stores `endTime` and recomputes `remainingMs` from `Date.now()` on a 250ms tick, instead of decrementing each second.
- Inputs are disabled while running; Reset restores the configured duration; Clear empties everything.
- The page also shows the current UTC time in a badge at the top-right corner (`utc-clock`, "UTC: HH:MM:SS"), updated every tick. Header layout: logo top-left, content centered below.
- Single page today; when adding pages, extract shared UI (nav, footer) into `src/components/` as TS render functions imported by each page's entry.

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