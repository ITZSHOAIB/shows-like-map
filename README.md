# Shows Like Map

**Find your next show, one you'll actually finish.**

Start from a series you loved and get the shows a fan of it would enjoy next. Each one comes with a one-line reason, how long it takes to finish, whether it ended or was cancelled, and the platform it's on. Global first, with Indian shows next. Free, no ads, no login.

Live at **[showslikemap.sohab.dev](https://showslikemap.sohab.dev)**. It's a static [Astro](https://astro.build) site on Cloudflare Pages: about 2,000 pages, no accounts, no tracking.

Found a wrong match, or want something taken down? [Open an issue](../../issues/new).

> The UI prototypes and data experiments are kept on branches (`prototype`, `home-prototype`, `peek-prototype`) as a record. `main` only gets validated decisions.

## Docs

- [Product brief](docs/product.md)
- [Plan: the five epics](docs/plan.md)
- Decisions:
  1. [Static Astro site on Cloudflare](docs/decisions/0001-static-site-on-cloudflare.md)
  2. [Open data: TVmaze and Wikidata, not TMDB](docs/decisions/0002-open-data-tvmaze-wikidata.md)
  3. [AI-curated matches, validated and measured](docs/decisions/0003-ai-curated-matches.md)
  4. [Commitment-first positioning](docs/decisions/0004-commitment-first-positioning.md)
  5. [Drill down show page](docs/decisions/0005-drill-down-show-page.md)
  6. [Dark only](docs/decisions/0006-dark-only.md)
  7. [Hold a poster to peek](docs/decisions/0007-hold-to-peek.md)
  8. [Home page: a wall of shows, and the time you have](docs/decisions/0008-home-wall-and-time.md)
  9. [How the site reads to search engines and link previews](docs/decisions/0009-search-previews-and-structured-data.md)

## Develop

Requires Node 22.22+ and pnpm.

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm typecheck
pnpm test       # unit tests
pnpm build
pnpm e2e        # browser tests against the built site (first: pnpm exec playwright install chromium)
```

The pages are built from generated data that isn't in git. `pnpm data` builds the catalogue from TVmaze and Wikidata. The "shows like" lists are generated offline and kept in a private dataset, so a fresh clone builds with every show page but no matches until the lists are published (see below). The weekly refresh and the lists are described in the [plan](docs/plan.md).

## Data and licences

- **Code:** [MIT](LICENSE).
- **Show data:** from [TVmaze](https://www.tvmaze.com/api) (CC BY-SA 4.0) and [Wikidata](https://www.wikidata.org/) (CC0).
- **Our dataset:** the "shows like X" lists and reasons will be published under CC BY-SA 4.0.
- Fetched and generated data is never committed (`data/` and `src/data/generated/` are git-ignored).
