# 15. Hold any show card to peek

- **Status:** accepted, 2026-11-23
- **Deciders:** Sohab Sk

## Context

Hold-to-peek (decision 0007) started on a show's “Shows like” cards. Home, search, time-filtered rows, and the kept list use show cards too, and a hold should behave consistently wherever one of those cards appears.

The payoff skyline (decision 0014) is useful before opening a show page, so its plain-language verdict belongs in the peek as well.

## Decision

- Holding any in-site show card opens the same peek: on the home wall, time rows, search results, `/kept/`, and show recommendation rows.
- Cards that link away from the site, such as unlinked TVmaze matches, do not peek.
- The peek includes the show's facts, synopsis, up to four leads, and payoff verdict when episode ratings are sufficient. Recommendation cards keep their “why it's similar” context; other cards omit it.
- Details outside a recommendation row load only when the user starts holding that card, so pages don't embed the whole catalogue.

## Consequences

- The hold gesture works consistently on every local show card.
- The extra peek data is fetched on demand from a compact static endpoint, while recommendation rows keep their existing precomputed context.
- The payoff verdict appears in the peek as text; the full skyline remains on the show page.
