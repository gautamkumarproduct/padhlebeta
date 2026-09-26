# Padhle Beta

> Free PDF tools for Indian students. Print coaching notes without burning ink.

Five browser-based PDF utilities built for NEET/JEE/Boards students. Every file stays on your device — no upload, no signup, no watermarks.

## What's in here

- **5 PDF tools** — dark → light, merge, compress, image → PDF, extract pages
- **Blog** with SEO-targeted study guides and PDF tips
- **Programmatic landing pages** for high-intent queries (`/neet-notes-pdf`, `/jee-notes-pdf`)
- **Full structured data** (WebApplication, FAQPage, HowTo, SoftwareApplication, BreadcrumbList, BlogPosting)
- **Privacy-first by design** — zero server-side processing
- **Open source** under MIT

## Tech stack

- **Astro 5** (static export, ships ~0 KB of JS by default)
- **pdf-lib** for client-side PDF manipulation
- **PDF.js** for rendering PDF pages to canvas (dark-to-light tool)
- **TypeScript** throughout
- **GitHub Actions** for CI/CD → GitHub Pages

## Local development

Requires Node 20+.

```bash
npm install
npm run dev       # http://localhost:4321/padhlebeta
npm run build     # → ./dist
npm run preview   # serve the production build
```

## Deploy to GitHub Pages

This repo is configured to auto-deploy on push to `main`.

1. Push to GitHub: `git push origin main`
2. GitHub Actions builds and deploys to `https://gautamkumarproduct.github.io/padhlebeta/`
3. To attach a custom domain (e.g. `padhlebeta.in`):
   - Add a `CNAME` file in `public/` containing the domain
   - Point your DNS to GitHub Pages
   - Enable "Enforce HTTPS" in repo Settings → Pages

## Project structure

```
padhlebeta/
├── .github/workflows/      # GitHub Actions: build & deploy
├── public/                 # Static assets (favicon, robots.txt, OG image)
├── src/
│   ├── components/         # Header, Footer, FAQ, Calculator, etc.
│   ├── content/blog/       # MDX blog posts (Astro content collections)
│   ├── data/site.ts        # Site config, tools metadata
│   ├── layouts/            # BaseLayout (HTML shell, JSON-LD, OG)
│   ├── lib/                # pdf-lib / PDF.js wrappers (one per tool)
│   ├── pages/              # File-routed pages
│   │   ├── index.astro
│   │   ├── tools/
│   │   ├── blog/
│   │   ├── neet-notes-pdf.astro
│   │   ├── jee-notes-pdf.astro
│   │   └── about.astro, privacy.astro, terms.astro, contact.astro, 404.astro
│   └── styles/global.css   # Design tokens + global styles
├── astro.config.mjs        # Astro config (sitemap, MDX, base path)
├── content.config.ts       # Astro 5 content collections schema
└── tsconfig.json
```

## Adding a new blog post

Create a new `.md` (or `.mdx`) file in `src/content/blog/`:

```markdown
---
title: "Your post title"
description: "One-sentence description (used for SEO + OG)"
pubDate: 2026-09-30
category: "NEET"   # one of: NEET, JEE, Boards, Productivity, Print Tips, Tools
tags: ["keyword one", "keyword two"]
---

Your content in Markdown.
```

That's it. The post will appear on `/blog/`, in the RSS feed, and in the homepage "From the blog" section.

## Adding a new tool

1. Add the tool's metadata to `src/data/site.ts` (name, description, FAQ, steps, benefits).
2. Create `src/lib/pdf-<slug>.ts` with the `run<ToolName>(file, status, ...)` function.
3. Add the tool's slug to the `tools` array — the `/tools/[slug]` page will pick it up automatically.

## Configuration

- **Site URL:** `src/data/site.ts` → `site.siteUrl`. Update when you attach a custom domain.
- **Base path:** `astro.config.mjs` → `base: '/padhlebeta'`. Change this if you rename the repo.
- **Analytics:** None by default. Add Plausible or Umami scripts to `BaseLayout.astro` if needed.

## Privacy

We do not have access to user files. The site never makes outbound requests carrying user content. See [src/pages/privacy.astro](src/pages/privacy.astro) for the full policy.

## Licence

MIT. See [LICENCE](LICENCE).
