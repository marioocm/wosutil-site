# AGENTS.md

## Project
Static website for WoS Util (Whiteout Survival utility): a rally countdown page and a battle simulator (placeholder). Open source (MIT), deployed to GitHub Pages. Stack: Vite + TypeScript + Tailwind CSS v4, package manager: pnpm.

## Structure
- `index.html` → redirects to the countdown page (GitHub Pages root URL); `public/404.html` → same redirect for unknown URLs (served by GitHub Pages, copied from `public/` into `dist/`)
- `countdown/index.html` → the countdown page (Vite multi-page build); entry `src/main.ts`
- `simulator/index.html` → the battle simulator page, currently a placeholder; entry `src/simulator.ts`
- `src/components/site-layout.ts` → shared chrome: header (wordmark, Simulator/Countdown nav, UTC clock, theme toggle, Share) and footer. Both page entries mount it into `#app`.
- `src/main.ts` → countdown entry point, DOM wiring, timer state machine
- `src/timer.ts` → pure helpers: time splitting, clamping, input parsing, UTC clock (unit-tested with Vitest)
- `src/redirect.ts` → root-relative countdown redirect: probes candidate paths so the redirect works from any URL (dev server, Pages subpath, forks). `index.html` imports it; `public/404.html` inlines a copy (can't be bundled). Unit-tested with Vitest.
- `src/theme.ts` → light/dark theme resolution, persistence (`wosutil:theme`) and the toggle button. Unit-tested with Vitest.
- `src/style.css` → Tailwind entry; `src/styles/theme.css` → design tokens (`@theme`, light/dark CSS variables)
- `docs/DESIGN.md` → design system reference (monochrome cream/ink palette, outlined cards, small radii, minimalist labels). **Read it before touching UI.**
- `.github/workflows/ci.yml` → typecheck, tests, build on every push/PR
- `.github/workflows/deploy.yml` → build + publish to GitHub Pages on main

## Key quirks
- Vite multi-page build: root `index.html` (redirect) + `countdown/index.html` + `simulator/index.html`, declared in `vite.config.ts` (`build.rollupOptions.input`).
- `base: './'` in `vite.config.ts` → relative asset paths, works on the Pages subpath and on forks.
- Site chrome is JS-rendered: each page calls `mountSiteHeader` and `mountSiteFooter` from `src/components/site-layout.ts` into `#app`. Add new sections to `NAV_ITEMS` there, plus a `<section>/index.html`, a Vite input and an entry file. Nav links are relative (`../<section>/`) and the active tab is passed per page (`active: 'countdown' | 'simulator'`). The active underline is a shared absolutely positioned bar: it slides under the hovered/focused section (180ms, reduced-motion aware) and returns to the active one on leave; clicks navigate immediately. On mobile the header is two rows (44px brand + actions, then 40px nav); from `sm` up it is a single 56px row.
- Tailwind v4 CSS-first config: tokens in `src/styles/theme.css` (`@theme`). No `tailwind.config.js`.
- Named spacing tokens (`--spacing-md: 12px`, …) collide with size utilities: `max-w-md` resolves to 12px, not 28rem. Always use arbitrary values for max-widths (e.g. `max-w-[34rem]`).
- Theme: light **and** dark. Pages follow `prefers-color-scheme` by default; the top-right toggle (`theme-toggle`) overrides it and persists the choice in `localStorage` (`wosutil:theme`). Every page runs a tiny inline script before the stylesheet to avoid a flash of the wrong theme; `src/theme.ts` wires the toggle.
- Semantic colors are CSS variables mapped through `@theme inline` (`--color-background`, `--color-paper`, `--color-ink`, …). Light values live in `:root`, dark values in `.dark`; use these tokens instead of raw hex values in components.
- Fonts: Instrument Sans + Geist Mono, loaded from Google Fonts in each page's `index.html`. Do not add proprietary fonts or copy Suisse Int'l — it requires a commercial license.
- Visual language: warm cream canvas, hairline outlined cards (no shadows), small radii (≤8px on cards, 4px on controls/rows), tight fluid headings, and monospace only for times/UTC. Keep the UI monochrome (ink/paper/tint); no colored accents or decorative labels/dots.
- The timer is duration-based (MM:SS display): the user enters minutes/seconds (`minutes-input`, `seconds-input` in `countdown/index.html`) and presses Play. State machine in `src/main.ts`: `configuredSeconds`, `remainingMs`, `running`, `finished`, `endTime`.
- Countdown runs drift-free: it stores `endTime` and recomputes `remainingMs` from `Date.now()` on a 250ms tick, instead of decrementing each second.
- Inputs are disabled while running; Reset restores the configured duration; Clear empties everything.
- The shared header shows the current UTC time (`utc-clock`, "UTC: HH:MM:SS") next to the theme toggle, updated every second by `site-layout.ts`. The Share action lives on the countdown page (`onShare` option). Leaving countdown writes a short-lived `sessionStorage` marker; the destination page renders a visual-only Share placeholder, starts in the countdown layout, then slides it behind its slot's right edge (320ms linear) while UTC/theme move to the destination positions. Countdown load plays the reverse. Navigation stays multi-page (full reload), **not SPA**: this keeps timer/state lifecycle simple.
- On narrow/touch viewports the sticky header auto-hides while scrolling down (`data-scroll-hidden`, 220ms) and returns on scroll up, near the top, or when a header control receives focus.
- The countdown page is the site default: the root `index.html` and `public/404.html` redirect there. `redirect.ts` and the inline 404 copy detect the countdown page via the static `id="countdown"` marker (the header is JS-rendered, so it can't be the marker).
- Drawer/panels: `rally-panel`, `enemy-panel` and `rally-queue` are outlined cards. Selected rows use a neutral tint with an ink border; running/flashing queue rows invert to ink/background. No color-coded accents.
- Two pages today (`countdown`, `simulator`). Shared UI lives in `src/components/site-layout.ts`; new sections need a `NAV_ITEMS` entry, a `<section>/index.html`, a Vite input and an entry file.

## Commands
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test` (watch: `pnpm test:watch`)
- Build: `pnpm build` (output `dist/`, preview: `pnpm preview`)

## Definition of done
A change is ready to merge only when: `pnpm typecheck`, `pnpm test` and `pnpm build` all pass locally, and the built output in `dist/` was sanity-checked (redirects, both pages render and the nav switches correctly).

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