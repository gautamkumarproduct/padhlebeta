# Padhle Beta

> Free PDF tools for Indian students. Print coaching notes without burning ink.

The core product: convert black-background coaching notes (PW, Unacademy, ALLEN…) into white, A4 printable PDFs — right on the homepage. Plus 12 more browser-based PDF tools. Every file stays on your device — no upload, no signup, no watermarks.

## What's in here

- **Dark → Light converter** on the homepage — auto-detects dark pages, cleans grey haze, A4 output, 1/2/4/6 slides per sheet, B&W option
- **12 more tools** — pages per sheet, grayscale, merge, split, extract, organise (thumbnails), rotate, crop, page numbers, compress, PDF → JPG, image → PDF
- **Focus timer** (Pomodoro) at `/focus-timer/`
- **Print guides** per platform at `/print/<platform>/` (`src/data/platforms.ts`) — converter embedded, tuned defaults
- **Search-intent pages** at `/<slug>/` (`src/data/intents.ts`) — e.g. black-background-pdf-to-white, invert-pdf-colors, Hindi/Hinglish guides
- **Blog** with SEO-targeted study guides and PDF tips
- **Exam pages** (`/neet-notes-pdf`, `/jee-notes-pdf`)
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
npm run dev       # http://localhost:4321/
npm run build     # → ./dist
npm run preview   # serve the production build
```

## Deploy to GitHub Pages

This repo is configured to auto-deploy on push to `main`.

1. Push to GitHub: `git push origin main`
2. GitHub Actions builds and deploys to `https://padhlebeta.live/` (custom domain via `public/CNAME`)
3. DNS: apex A records → GitHub Pages IPs (185.199.108–111.153), `www` CNAME → `gautamkumarproduct.github.io`
4. Changing domain: edit `public/CNAME`, `public/robots.txt` and the `SITE` default in `astro.config.mjs`

Search Console / Bing verification: set `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` as env vars on the build step.

Regenerate OG images and icons after renaming tools: `node scripts/generate-assets.mjs`.

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
- **Domain / base path:** `astro.config.mjs` (`SITE_URL` / `BASE_PATH` env vars, default `https://padhlebeta.live` at `/`).
- **Analytics:** None by default. Add Plausible or Umami scripts to `BaseLayout.astro` if needed.

## Privacy

We do not have access to user files. The site never makes outbound requests carrying user content. See [src/pages/privacy.astro](src/pages/privacy.astro) for the full policy.

## Licence

MIT. See [LICENCE](LICENCE).
