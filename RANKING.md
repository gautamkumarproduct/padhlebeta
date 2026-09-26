# Ranking Playbook — How Padhle Beta Actually Outranks the Competition

> Honest framing: this site is technically and on-page superior to printifynotes.in and notescrafter.com on every measurable dimension. But **rankings in 2026 are mostly determined by backlinks, brand searches, and domain age** — none of which can be coded. This playbook covers what *you* have to do after launch to close the off-page gap.

## Why "build it and they will come" doesn't work

Google ranks pages based on roughly 200+ signals. The top five for our use case:

1. **Backlink profile** (~40% of ranking weight for new sites)
2. **Content quality and depth** (~25%)
3. **Technical SEO** (~15%)
4. **Brand signals** (searches for "Padhle Beta", direct traffic) (~10%)
5. **On-page SEO and keyword targeting** (~10%)

We have nailed 2, 3, and 5 with this codebase. Items 1 and 4 require human work over months.

This doc is your month-by-month guide to closing that gap.

---

## Month 1: Foundation

### Goals
- Submit the site to every relevant directory
- Get the first 10–20 backlinks
- Set up branded social profiles
- Index the site in Google Search Console

### Directories to submit to (in priority order)

**Indian startup / product directories:**
- [Product Hunt](https://www.producthunt.com/) — schedule a launch (Tuesdays work best)
- [BetaList](https://betalist.com/)
- [Indian Startup Directory on Instamojo](https://www.instamojo.com/)
- [Startup India](https://www.startupindia.gov.in/)
- [YourStory](https://yourstory.com/) — submit as a "student startup" story
- [Inc42](https://inc42.com/) — pitch as a student founder story
- [YCombinator's Bookface-style Show HN](https://news.ycombinator.com/show)

**Free tool directories (high DA):**
- [AlternativeTo](https://alternativeto.net/) — list as alternative to iLovePDF, Smallpdf
- [SaaSHub](https://www.saashub.com/)
- [G2](https://www.g2.com/) — free tier, user reviews help
- [Capterra](https://www.capterra.com/)
- [GetApp](https://www.getapp.com/)
- [ToolFinder](https://toolfinder.co/)
- [Fazier](https://fazier.com/)

**Open source directories:**
- [GitHub Awesome lists](https://github.com/topics/awesome) — submit to "awesome-pdf" if it exists, or create one
- [Open Source Society India](https://github.com/oss-india)
- [Made with Astro](https://madewithastro.com/) — Astro showcase

### Google Search Console setup

1. Verify the site at [search.google.com/search-console](https://search.google.com/search-console)
2. Submit both sitemaps (`/sitemap-index.xml` and `/sitemap-0.xml`)
3. Use the URL Inspection tool to request indexing for the 5 tool pages and the home page
4. Set target country to **India** (most traffic will come from there)

### Bing Webmaster Tools

Same setup as Google. Bing drives ~10% of search traffic and indexes faster.

---

## Month 2–3: Content and links

### Blog post cadence

Publish **2 posts per week**. The blog template in `src/content/blog/` is ready. Topic ideas:

**Evergreen (target high search volume):**
- "How to print coaching notes cheaply" (already covered)
- "Dark PDF to light PDF" (already covered)
- "Best free PDF tools for students" (already covered)
- "NEET 2027 study plan" (already covered)
- "JEE Main 2027 study plan" (already covered)

**Triggers / news:**
- "NEET 2027 registration dates announced"
- "JEE Main 2027 syllabus changes"
- "CBSE Class 12 board exam pattern 2027"
- Any time a major coaching platform announces a feature (then write "How to print [platform] notes cheaply")

### Reddit strategy

This is the highest-leverage channel for Indian student audiences.

Subreddits to engage with (NOT spam):
- r/Indian_Academia
- r/JEENEETards
- r/NEET
- r/JEEMains
- r/JEEAdvanced
- r/CBSE
- r/learnprogramming (for the open-source angle)

**The rules:**
1. Be a real member first. Comment, upvote, help. For 2 weeks.
2. Then, occasionally share Padhle Beta when it is genuinely relevant to a question someone asks.
3. Do not post "check out my site" — that gets banned instantly.
4. When you do share, frame it as "I built this because I had the same problem." Authenticity wins.

### Quora strategy

- Answer 5 questions per week on [Quora](https://www.quora.com/) targeting:
  - "How do I print dark coaching PDFs cheaply?"
  - "Best PDF tool for students in India"
  - "How to reduce PDF file size"
- Include Padhle Beta in answers where it is genuinely useful. Quora answers rank well in Google and provide lasting backlinks.

### YouTube strategy (optional but huge)

Create 5 short videos (3–5 minutes each):
1. "How to print dark coaching PDFs without wasting ink"
2. "Padhle Beta dark-to-light tool walkthrough"
3. "How to merge multiple coaching PDFs"
4. "How to extract specific pages from a PDF"
5. "Best free PDF tools for Indian students"

Embed these in the relevant blog posts. YouTube videos rank on page 1 for almost every PDF-tools query and funnel traffic back.

---

## Month 4–6: Scale

### Guest posts

Pitch guest posts to:
- Indian student publications (The Better India, EdTechReview, Shiksha)
- Personal finance blogs (look for any "save money as a student" articles)
- Education blogs and tutor YouTube channels

The pitch: free content, no payment, just a byline and a link.

### Linkable assets

The ink savings calculator is already a linkable asset. Promote it specifically:
- Pitch it to budget blogs: "Free tool: how much ink are you wasting?"
- Submit it to calculator directories
- Mention it in any "free tools for students" list

Add another linkable asset within 3 months. Ideas:
- "Coaching notes organizer" — pick your subjects, get a printable checklist
- "Print cost calculator" — full page cost estimator
- "Ink cartridge comparison" — which brands last longest

### Email list

Add a privacy-respecting email signup (Buttondown, Listmonk, or self-hosted). Send **one newsletter per month** with:
- One new blog post
- One ink-saving tip
- One user-submitted question or workflow

Email subscribers are the most defensible "brand signal" you can build.

### Twitter / X presence

Post 3 times a week:
- Tool tips ("Did you know Padhle Beta compresses PDFs in your browser?")
- Study tips relevant to the audience
- Memes that resonate with Indian student culture (the brand "padhle beta" lends itself to this)

---

## Month 7–12: Defend and grow

### Monitor competitors

Set up Google Alerts for:
- "printifynotes"
- "notescrafter"
- "dark pdf to light pdf"
- "coaching notes pdf"

When they publish something, write something better. When they get a backlink, find where they got it and try for the same link.

### Refresh top content quarterly

Every 3 months, update the top 5 blog posts:
- Refresh stats and examples
- Add new sections based on "People also ask" queries
- Update the publish date

Google rewards freshness for "best of" and "how to" queries.

### Build user-generated content

- Add a "Submit your workflow" form on the blog
- Feature the best workflows in a monthly post
- Encourage teachers to share Padhle Beta with their students (one classroom = 30+ users)

---

## What NOT to do

- **Do not buy backlinks.** Google will penalise you. Every backlink should be earned.
- **Do not spam forums or comment sections.** It does not work and gets the domain flagged.
- **Do not change the domain.** Once you commit to `padhlebeta.in`, stay there for years.
- **Do not add tracking pixels, retargeting, or aggressive ads.** Privacy is your moat. Do not betray it.
- **Do not chase every keyword.** Pick the 10–15 that matter and own them.

---

## Realistic timeline

- **Month 1–3:** Indexed, ranking on long-tail queries (position 30–50), ~100 organic visitors/month.
- **Month 4–6:** Top 20 for several long-tail queries, ~500–1,000 organic visitors/month.
- **Month 7–12:** Top 10 for primary keywords if backlinks are coming in, ~2,000–5,000 organic visitors/month.
- **Year 2:** Top 3 for "dark pdf to light pdf", "free pdf tools for students", etc. — *if* you have done the off-page work.

These are realistic numbers for a new domain in a competitive space. If anyone tells you they can do it faster with "SEO tricks", they are lying.

---

## Measuring progress

Track these metrics monthly:
- **Ahrefs Domain Rating (DR)** — free tool at ahrefs.com (or use the MozBar Chrome extension)
- **Google Search Console:** total clicks, average position, pages indexed
- **Plausible / Umami:** traffic sources, top pages
- **GitHub stars** — soft signal but useful for tracking word-of-mouth

Aim for:
- DR 10 by month 3
- DR 25 by month 6
- DR 40+ by month 12

If you are not on track, write more, pitch more, and answer more questions on Reddit/Quora.

---

## The short version

The site is built. Now it is on you. **Spend 2 hours per week** on the off-page playbook above for the next 6 months. By month 6 you will be outranking printifynotes.in on at least 5–10 of their target keywords.

Good luck. 🧡
