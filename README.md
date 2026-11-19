# Shows Like Map

**Find your next show, one you'll actually finish.**

Start from a series you loved and get the shows a fan of it would enjoy next. Each one comes with a one-line reason, how long it takes to finish, whether it ended or was cancelled, and the platform it's on. India-first, free, no ads, no login.

> Status: planning and scaffolding. The UI prototypes and data experiments are on the [`prototype`](../../tree/prototype) branch.

## Docs

- [Product brief](docs/product.md)
- [Plan: the five epics](docs/plan.md)
- Decisions:
  1. [Static Astro site on GitHub Pages](docs/decisions/0001-static-site-on-github-pages.md)
  2. [Open data: TVmaze and Wikidata, not TMDB](docs/decisions/0002-open-data-tvmaze-wikidata.md)
  3. [AI-curated matches, validated and measured](docs/decisions/0003-ai-curated-matches.md)
  4. [Commitment-first positioning](docs/decisions/0004-commitment-first-positioning.md)
  5. [Drill down show page](docs/decisions/0005-drill-down-show-page.md)

## Develop

Requires Node 22.22+ and pnpm.

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm typecheck
pnpm build
```

## Data and licences

- **Code:** [MIT](LICENSE).
- **Show data:** from [TVmaze](https://www.tvmaze.com/api) (CC BY-SA 4.0) and [Wikidata](https://www.wikidata.org/) (CC0).
- **Our dataset:** the "shows like X" lists and reasons will be published under CC BY-SA 4.0.
- Fetched and generated data is never committed (`data/` and `src/data/generated/` are git-ignored).
