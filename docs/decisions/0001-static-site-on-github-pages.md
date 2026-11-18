# 1. A static Astro site on GitHub Pages, no backend

- **Status:** accepted, 2026-11-18
- **Deciders:** Sohab Sk

## Context

The site must cost nothing to run and stay fast on mid-range Android phones. Every show page is the same for every visitor, and the data changes slowly (weekly is fine).

## Decision

- **Astro 7** (pinned) with plain TypeScript, built to static HTML. There's no server and no database.
- Hosted on **GitHub Pages** at `showslikemap.sohab.dev`.
- Data is fetched and processed at build time by scripts in `scripts/`. A scheduled GitHub Actions job rebuilds the site weekly.
- Search runs in the browser over a small prebuilt index.

## Consequences

- Hosting is free and traffic spikes cost nothing. Pages can be served from a CDN and prefetched for instant navigation.
- The catalogue size is bounded by build time and GitHub Pages limits (1 GB per site), which is comfortable up to roughly 10k shows.
- Anything personal (filters, the path you took) lives in the browser only.
