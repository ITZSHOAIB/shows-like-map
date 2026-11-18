# 3. Matches are AI-curated offline, validated against real data, and measured by an eval

- **Status:** accepted, 2026-11-19
- **Deciders:** Sohab Sk

## Context

Matching quality is the product. We measured three engines on 20 well-known shows (Indian and international) against hand-made lists of acceptable matches:

| Engine | Top-5 precision | Top-10 precision |
|---|---|---|
| TMDB's own recommendations | 0.25 | 0.18 |
| IDF-weighted metadata similarity (TMDB keywords, genres, creators, cast), tuned | 0.41 | 0.32 |
| AI-generated lists | **0.89** | **0.82** |

Metadata similarity fails on sparse keywords (Severance has 6 keywords; one shared "workplace" decided its matches). It also mixes audiences and lets Indian shows drift to foreign ones.

## Decision

- For each show, a **fresh, tool-less Claude session** (`claude -p --tools ""`, run outside the repo) is given only the show's name, year and platform. It returns the 15 series a fan would enjoy next, each with a reason of 12 words or fewer.
- **Every pick is resolved to a TVmaze show.** Picks TVmaze can't find, or whose first-air year is off by more than one, are dropped. This guards against made-up shows.
- **Shows the model clearly doesn't know** get a labelled fallback list from metadata (platform, genre, cast via Wikidata).
- Lists are generated **once per show** and stored. They aren't generated per visitor. New shows are added on the weekly update.
- **The catalogue is closed under recommendation:** every recommended show gets its own page and its own list.
- The **eval** (`scripts/eval-*`) stays in the repo and gates changes to prompts, models or batching.

## Consequences

- No AI runs at visit time: pages are static and cost nothing to serve.
- Generation uses Claude subscription quota. The full first run is the main cost (roughly 500 calls for 10k shows at 20 per call); weekly additions are small.
- Caveat: the eval's acceptable lists were also written by Claude, so scores are optimistic. The eval needs human spot checks and lesser-known Indian shows.
- The published lists and reasons are part of the open dataset (CC BY-SA, decision 2).
