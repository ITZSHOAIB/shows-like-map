# 2. Open data: TVmaze and Wikidata, not TMDB or IMDb

- **Status:** accepted, 2026-11-19
- **Deciders:** Sohab Sk

## Context

The prototype used TMDB. Reading TMDB's API Terms of Use (last updated 2023-10-20) in detail turned up these problems:

- **§1.C, "you shall not"** includes "Make derivatives of the TMDB APIs or TMDB Content", and "Use the TMDB APIs or TMDB Content in connection with, including for training, a machine learning (ML) or artificial intelligence (AI) based Application".
- **§1.C** also says no caching for longer than 6 months.
- **§2.A** treats revenue from ads, or from "recommending content", as commercial.

Similarity lists computed from TMDB data are arguably derivatives. The best-quality matching option (decision 3) would put TMDB content "in connection with" AI.

IMDb's datasets are for personal and non-commercial use only. OMDb is CC BY-NC and bans building an index.

## Decision

Use only open data:

| Source | Licence | Used for |
|---|---|---|
| [TVmaze API](https://www.tvmaze.com/api) | CC BY-SA 4.0 ("can freely be used for any purpose", credit and link back, ShareAlike) | Shows, episodes and runtimes, status, platform, posters (hotlinking allowed), summaries, ratings where present |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing) | CC0 | Cast, creators, cross-site IDs |

TMDB and IMDb are not used anywhere on the site.

## Consequences

- **Allowed:** AI-made match lists, publishing our dataset, and caching with no time limit.
- **Attribution:** credit and link TVmaze on every show page and in the footer.
- **ShareAlike:** data we derive from TVmaze is published under CC BY-SA 4.0.
- **Lost: live per-country streaming availability.** We show the platform a show airs on (from TVmaze) and link out to JustWatch for "where to watch in India".
- **Lost: ratings for many shows.** TVmaze ratings are sparse for Indian web series.
- **Coverage (checked 2026-11-19):** every Indian web series we tried is on TVmaze (Panchayat, Gullak, Kudi Yedamaithe, Gram Chikitsalay…). Wikidata has 56,856 TV series, 3,041 of them Indian.
- **Still to verify:** whether TVmaze's poster images fall under its copyright policy; see the plan.
