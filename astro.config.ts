import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const repository = process.env.GITHUB_REPOSITORY?.split('/') ?? []
const owner = repository[0]
const name = repository[1]
const isUserSite = name !== undefined && name === `${owner}.github.io`
const rawBase = process.env.BASE_PATH ?? (name && !isUserSite ? `/${name}/` : '/')
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
const site =
  process.env.SITE_URL ?? (owner ? `https://${owner}.github.io` : 'https://marioocm.github.io')

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  prefetch: true,
  redirects: {
    '/': `${base}countdown/`,
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname
        return path !== base && path !== `${base}404/` && path !== `${base}404.html`
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
