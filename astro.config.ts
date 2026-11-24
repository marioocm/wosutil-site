import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://wosutil.tech',
  trailingSlash: 'always',
  prefetch: true,
  integrations: [
    {
      name: 'dev-trailing-slash-ignore',
      hooks: {
        'astro:config:setup': ({ command, updateConfig }) => {
          // The dev server applies trailingSlash before Vite's proxy and would
          // 404 extensionless API requests such as /api/v1/reports. Relax it
          // only in development; the build keeps the stricter "always" rule.
          if (command === 'dev') updateConfig({ trailingSlash: 'ignore' })
        },
      },
    },
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
  },
})
