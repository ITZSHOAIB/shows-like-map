# Plan

Epics, in rough order. Each becomes a GitHub issue; research spikes are issues too. Decisions live in [`docs/decisions`](decisions).

## Research spikes (before or alongside the epics that depend on them)

| # | Question | Blocks | How we'll answer it |
|---|---|---|---|
| R1 | How good are AI picks for **lesser-known Indian shows**? | E2 scale-up | Add 10–20 lesser-known Indian shows to the eval, plus human spot checks |
| R2 | How much **Claude quota** does generation use per show? What batch size and model are best? | E2 scale-up | Generate a 500-show slice; compare batch sizes and models on the eval |
| R3 | Can **Claude Code run in GitHub Actions** on a subscription (not the paid API), within the terms? | E5 automation | Read the Claude Code GitHub Actions docs and the subscription terms |
| R4 | **TVmaze poster images:** do they fall under its copyright policy, and is hotlinking OK at our scale? | E3 launch | Read tvmaze.com/site/copyright; ask TVmaze if unclear |
| R5 | **Ratings:** show TVmaze ★ only where present, drop it, or replace it? | E3 cards | Measure coverage on the catalogue, then decide |
| R6 | **Production performance** of the Drill down page on a mid-range Android phone | E3 launch | Build and measure against the 300 ms tap budget |

## Epics

### E1. Data pipeline: open catalogue
Fetch TVmaze shows and episodes plus Wikidata cast and creators into a cached, git-ignored `data/`.
- **Seeds:** TVmaze's most-followed shows, plus Indian shows.
- **Per show:** status, seasons, episode runtimes → hours to finish, platform, poster, summary.
- **Output:** compact generated JSON for the site.
- **Done when:** the seed catalogue builds reproducibly from one command, with exact hours to finish.

### E2. Matches: AI-curated lists
Port `gen-similar`, `resolve` and `eval` from the prototype into a real pipeline.
- **Generation:** batched generation, picks validated against TVmaze, a metadata fallback for unknown shows, and catalogue closure (every pick gets a page).
- **The eval** runs locally, and in CI when prompts change.
- **Done when:** every catalogue show has 15 validated picks with reasons, and the eval is at or above 0.85 top-5 on the extended set (R1).

### E3. Site: show pages (v1)
Production version of the Drill down page (decision 5) on the open data.
- **Show page:** hero with status, hours and platform; rows of matches with reasons; tap to go deeper, with the poster morph and the "Your path" strip.
- **Filters:** finished only, under N hours, platforms, language.
- **Links:** "Where to watch" to JustWatch; TVmaze credit and link.
- **Done when:** it meets the 300 ms tap budget (R6), works without JavaScript, and passes accessibility basics.

### E4. Discovery: home, search, SEO
- Home page with the commitment-first pitch and starter grid.
- Client-side search index.
- **SEO:** "Shows like X" titles and descriptions, structured data, sitemap, Open Graph images.
- **Done when:** every show page is indexable and search finds any catalogue show by name.

### E5. Automation: weekly refresh
- A scheduled GitHub Actions job: fetch TVmaze updates → generate picks for new shows (R3) → rebuild → deploy to GitHub Pages at `showslikemap.sohab.dev`.
- **Done when:** a new show appears on the site within a week with no manual steps.

### E6. Explore extras
- Hold-to-peek fan and path map from the prototype, within the performance budget.
- **Done when:** both work smoothly on a mid-range Android phone, with no native long-press menu.

### E7. Open dataset
- Publish the "shows like X" graph (picks, reasons, TVmaze IDs) under CC BY-SA 4.0 as a versioned release asset, with a data README and attribution.
- **Done when:** a developer can download and use it with clear licence terms.

### E8. Launch
- **Attribution and licences:** About page; TVmaze and Wikidata credits; MIT for code, CC BY-SA for data.
- **Domain:** DNS for `showslikemap.sohab.dev`.
- **Repo:** flip to public; announce.
