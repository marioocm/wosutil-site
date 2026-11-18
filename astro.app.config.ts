import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// Desktop shell build. It lives in its own source root so the public site
// pages (sitemap, robots, countdown) are not built twice, and it uses the
// local server root as base instead of the GitHub Pages base path.
export default defineConfig({
  srcDir: 'src-app',
  base: '/',
  outDir: 'dist-app',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
})
