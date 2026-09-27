# On-Page & Technical SEO Checklist

This site ships with a strong on-page SEO foundation. This document is the implementation log — what we did, where, and why. Use it to audit and verify.

## Meta & head tags (every page)

Every page inherits from `src/layouts/BaseLayout.astro`:

- ✅ `<title>` — page-specific, falls back to site name
- ✅ `<meta name="description">` — unique per page
- ✅ `<link rel="canonical">` — set to production URL (handles base path)
- ✅ `<meta name="theme-color">`
- ✅ Open Graph: `og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `og:locale`
- ✅ Twitter Card: `summary_large_image` with title/description/image
- ✅ `<link rel="alternate" type="application/rss+xml">`
- ✅ `<link rel="sitemap">`

## Structured data (JSON-LD)

Implemented schemas:

| Page | Schema(s) |
|------|-----------|
| Home | `Organization`, `WebApplication`, `BreadcrumbList` |
| Tools index | `CollectionPage`, `ItemList` |
| Each tool page | `HowTo`, `SoftwareApplication`, `BreadcrumbList`, plus `FAQPage` from `<FAQ>` |
| Blog index | `Blog` |
| Each blog post | `BlogPosting`, `BreadcrumbList` |
| About | `AboutPage` |
| Privacy | `PrivacyPolicy` |
| Terms | `TermsOfService` |
| Contact | `ContactPage` |
| Landing pages (`/neet-notes-pdf`, `/jee-notes-pdf`) | `WebPage` |

To verify, paste any page URL into [Google's Rich Results Test](https://search.google.com/test/rich-results).

## Sitemaps

- `@astrojs/sitemap` generates `/sitemap-index.xml` and `/sitemap-0.xml`
- `robots.txt` points to the sitemap
- All public pages are included automatically
- Sitemap priority is 0.7 by default; consider custom priority per page in future iterations

## Performance

Target: 95+ Lighthouse score, sub-second FCP.

- ✅ Astro ships zero JavaScript by default
- ✅ PDF utilities are dynamically imported only when the user runs a tool
- ✅ Fonts are preconnected and use `display=swap`
- ✅ Compressed HTML output (`compressHTML: true`)
- ✅ Images use `loading="lazy"` where appropriate (add when blog posts include images)
- ⚠️ Verify after first deploy with [PageSpeed Insights](https://pagespeed.web.dev/)

## Accessibility

- ✅ Skip-to-content link
- ✅ Semantic HTML (`<main>`, `<nav>`, `<article>`, `<header>`, `<footer>`, `<aside>`)
- ✅ ARIA labels on icon-only buttons and navigation
- ✅ Color contrast verified against WCAG AA in both light and dark themes
- ✅ All form fields have associated `<label>`s
- ✅ Focus states visible (`outline: 2px solid var(--accent)`)
- ✅ Reduced-motion preference respected

## Internal linking

Every page links to:
- Home (via header logo)
- Tools index
- Blog index
- At least one related blog post or tool page (via "Related tools" / "From the blog" / inline links)

This creates a tight internal link graph that helps Google understand topical relevance.

## Keyword strategy

### Primary keywords (target with the 5 tool pages)
- "dark pdf to light pdf" → `/tools/dark-to-light/`
- "merge pdf online free" → `/tools/merge/`
- "compress pdf online free" → `/tools/compress/`
- "image to pdf online free" → `/tools/image-to-pdf/`
- "extract pages from pdf" → `/tools/extract-pages/`

### Long-tail keywords (target with landing pages)
- "neet notes pdf" → `/neet-notes-pdf/`
- "jee notes pdf" → `/jee-notes-pdf/`
- "coaching notes print" → `/blog/print-dark-coaching-pdfs-without-wasting-ink/`
- "save ink printing" → `/blog/ink-saving-printer-settings-every-student/`

### Blog keyword clusters
Each blog post targets 1–2 primary keywords + 5–10 long-tail variations.

## Image SEO (TBD)

When blog posts include images:
- Use descriptive filenames (`dark-pdf-light-pdf-comparison.jpg`)
- Always include `alt` text
- Use Astro's `<Image>` component for automatic optimisation
- Add images to the sitemap (when `@astrojs/sitemap` supports it)

## Local SEO

Not applicable yet. If we launch a Hindi-language version or a specific city-targeted landing page, set up:
- `hreflang="en-in"` on Indian pages
- `hreflang="x-default"` on the home page

## Monitoring

After launch, set up:
- **Google Search Console** — primary source of truth for indexing and rankings
- **Bing Webmaster Tools** — Bing drives ~10% of search traffic
- **Plausible or Umami** — privacy-respecting analytics
- **Ahrefs or Semrush** — backlink monitoring (free trials are enough to start)

## Things still TODO before launch

- [ ] Replace placeholder `site.contactEmail` with a real address
- [x] Final domain: `padhlebeta.live`
- [ ] If using custom domain: update `site.siteUrl` in `src/data/site.ts`, add `public/CNAME`
- [ ] Generate a real OG image (currently an SVG; PNG/JPG renders better on some platforms)
- [ ] Add Open Graph variants per page type (tool page OG should mention the tool)
- [ ] Run Lighthouse audit and address any regressions
- [ ] Submit to Google Search Console and Bing Webmaster Tools
- [ ] Verify rich results for at least the home page and one tool page

---

## Reference

- [Google Search Central — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Web Vitals](https://web.dev/vitals/)
- [Schema.org full type list](https://schema.org/docs/full.html)
