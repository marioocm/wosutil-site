# WoS Util Site

Static website for [WoS Util](https://github.com/marioocm/wosutil) — a rally countdown timer with rally/enemy callers, call queue, shareable setup and a live UTC clock, plus a battle simulator (Hero Comparison, Joiners, Troop Power and Stats Bonuses).

Live site: [marioocm.github.io/wosutil-site](https://marioocm.github.io/wosutil-site/)

## Stack

- [Astro](https://astro.build/) 7 — static output, file-based pages, islands
- [TypeScript](https://www.typescriptlang.org/) 7
- [Tailwind CSS](https://tailwindcss.com/) v4 — CSS-first config via `@theme`
- [Vitest](https://vitest.dev/) 4 — unit tests
- [pnpm](https://pnpm.io/) — package manager
- GitHub Pages + GitHub Actions — CI/CD

## Local development

```sh
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:4321/`.

## Checks

```sh
pnpm typecheck   # TypeScript
pnpm test        # Vitest
pnpm build       # production build -> dist/
pnpm preview     # preview the production build
```

## Structure

- `src/pages/` — routes: countdown, simulator, 404 and `robots.txt`.
- `src/layouts/` — document shell (`BaseLayout`) and site chrome (`SiteLayout`).
- `src/components/` — static header/footer, the countdown widgets and the shared hero visual helper.
- `src/scripts/` — browser behavior: countdown island, header chrome, hero picker, joiner picker, troop ratio and the simulator stat table.
- `src/lib/` — shared logic and types, with Vitest tests.
- `src/styles/` — Tailwind entry and design tokens.
- `public/` — `.nojekyll` (required for Astro's `_astro/` assets on Pages) and favicon.
- `astro.config.ts` — static config, base/site, root redirect, sitemap and prefetch.

## Deployment

GitHub Actions builds and publishes `dist/` to GitHub Pages on `main`. The Astro `base`/`site` are derived from `GITHUB_REPOSITORY`, so project pages and forks work without editing the config; override them with `BASE_PATH`/`SITE_URL` if needed. The root URL redirects to `/countdown/`.

## Design and contributing

- Design system: [docs/DESIGN.md](docs/DESIGN.md).
- Architecture, quirks and commit conventions: [AGENTS.md](AGENTS.md).

## License

MIT — see [LICENSE](LICENSE).
