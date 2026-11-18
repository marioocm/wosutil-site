import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// Desktop shell build. It lives in its own source root so the public site
// pages (sitemap, robots, countdown) are not built twice, and it uses the
// local server root as base instead of the GitHub Pages base path.
const apiTarget = process.env.WOSUTIL_API ?? 'http://127.0.0.1:8765'

export default defineConfig({
  srcDir: 'src-app',
  base: '/',
  outDir: 'dist-app',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
      },
    },
  },
})
