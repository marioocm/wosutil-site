# WoS Util Site

Static website for [WoS Util](https://github.com/marioocm/wosutil) — a rally countdown timer (set a duration in MM:SS, press play, reset or clear it, with a live UTC clock) and a battle simulator (in development). A shared nav switches between both sections.

## Stack

- [Vite](https://vite.dev/) 8 — multi-page static build
- [TypeScript](https://www.typescriptlang.org/) 7
- [Tailwind CSS](https://tailwindcss.com/) v4 — CSS-first config via `@theme`
- [Vitest](https://vitest.dev/) 4 — unit tests
- [pnpm](https://pnpm.io/) — package manager
- GitHub Pages + GitHub Actions — CI/CD

Design system: monochrome warm editorial UI with light/dark themes and a system-aware toggle (see [docs/DESIGN.md](docs/DESIGN.md)).

## Local development

```sh
pnpm install
pnpm dev
```

## Checks

```sh
pnpm typecheck   # TypeScript
pnpm test        # Vitest
pnpm build       # production build → dist/
```

## CI/CD

- `.github/workflows/ci.yml` — typecheck, tests and build on every push/PR.
- `.github/workflows/deploy.yml` — builds and publishes to GitHub Pages on push to `main`.

The site lives at `/countdown/` and `/simulator/`; the root URL redirects to `/countdown/`.

## License

MIT — see [LICENSE](LICENSE).