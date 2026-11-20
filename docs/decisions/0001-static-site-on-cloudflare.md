# 1. A static Astro site on Cloudflare, no backend

- **Status:** accepted, 2026-11-18; amended 2026-11-20 (hosting moved from GitHub Pages to Cloudflare)
- **Deciders:** Sohab Sk

## Context

The site must cost nothing to run and stay fast on mid-range Android phones. Every show page is the same for every visitor, and the data changes slowly (weekly is fine).

## Decision

- **Astro 7** (pinned) with plain TypeScript, built to static HTML. There's no server and no database.
- Hosted on **Cloudflare** (static assets, free plan) at `showslikemap.sohab.dev`. GitHub Pages was the first choice, but it needs a paid GitHub plan for a private repo.
- Data is fetched and processed at build time by scripts in `scripts/`. A scheduled GitHub Actions job rebuilds the site weekly and uploads the built files with `wrangler deploy`, so Cloudflare never sees the repo or the data token.
- Search runs in the browser over a small prebuilt index.

## Consequences

- Hosting is free and traffic spikes cost nothing. Pages can be served from a CDN and prefetched for instant navigation.
- The catalogue size is bounded by build time and Cloudflare's limit of 20,000 files per deploy (the 1,991-show catalogue is 1,993 files, 16 MB), which is comfortable up to roughly 10k shows.
- The repo can stay private; going public is a separate choice. It went public on 2026-11-20, so visitors can report a problem or a takedown on GitHub Issues (the About page says so); hosting didn't change.
- Anything personal (filters, the path you took) lives in the browser only.
