import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// IMPORTANT: when you attach a custom domain, change this.
// While hosted at github.io, use the GH Pages URL.
const SITE = 'https://gautamkumarproduct.github.io';

export default defineConfig({
  site: SITE,
  base: '/padhlebeta',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    assets: '_astro',
  },
  integrations: [
    sitemap({
      // Sitemap is generated from /src/pages — every route gets included.
      changefreq: 'weekly',
      priority: 0.7,
    }),
    mdx(),
  ],
  vite: {
    // pdf-lib ships CommonJS; pre-bundle so client islands stay small.
    ssr: {
      noExternal: ['pdf-lib'],
    },
    optimizeDeps: {
      include: ['pdf-lib'],
    },
  },
  compressHTML: true,
});
