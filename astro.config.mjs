import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Deploy target. Override both with env vars when moving to a custom domain:
//   SITE_URL=https://padhlebeta.in BASE_PATH=/ npm run build
const SITE = process.env.SITE_URL ?? 'https://gautamkumarproduct.github.io';
const BASE = process.env.BASE_PATH ?? '/padhlebeta';
const BASE_PREFIX = BASE.replace(/\/$/, '');

/** Prefix root-relative links in Markdown content with the base path. */
function rehypeBaseLinks() {
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'a') {
      const href = node.properties?.href;
      if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')) {
        node.properties.href = BASE_PREFIX + href;
      }
    }
    node.children?.forEach(visit);
  };
  return (tree) => visit(tree);
}

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    assets: '_astro',
  },
  markdown: {
    rehypePlugins: [rehypeBaseLinks],
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        const path = new URL(item.url).pathname.replace(BASE_PREFIX, '') || '/';
        if (path === '/') item.priority = 1.0;
        else if (path.startsWith('/tools/') || path.startsWith('/print/')) item.priority = 0.9;
        else if (path.startsWith('/blog/')) item.priority = 0.6;
        return item;
      },
    }),
    mdx(),
  ],
  vite: {
    ssr: {
      noExternal: ['pdf-lib'],
    },
    optimizeDeps: {
      include: ['pdf-lib'],
    },
  },
  compressHTML: true,
});
