# 10. A step further out: when your time filter empties a list

- **Status:** accepted, 2026-11-20
- **Deciders:** Sohab Sk

## Context

The site's promise is a show you can finish in the time you have. But a show has only ten matches, and measuring the catalogue showed what the time filter does to them:

| Filter on a show's matches | Shows left with no match |
|---|---|
| Finished and under 20 h | 656 of 1,989 (33%) |
| Finished and under 40 h | 340 (17%) |
| Finished and under 80 h | 106 (5%) |

A third of shows answered the main filter with "None match". The match graph is wide enough to do better: from a show's ten matches, a second step reaches about 35 more shows.

## Decision

While a filter is on and the show's own matches leave fewer than six, the page adds a row, **A step further out**: shows that this show's matches list, filtered the same way. Each card says which match it came through ("Via Better Call Saul. …") and keeps that match's reason.

- **Ranking:** a show scores higher the more of this show's matches list it, and higher still when those matches rank early. The show itself and its direct matches are left out.
- **Every filter finds some:** the page carries the best eight for each filter (finished, and finished under each hour limit), 25 cards at most. CSS hides what the chosen filter doesn't pass, as it does for the first row, so it works without JavaScript. JavaScript only hides the row again once the first row has six or more left.
- **No filter, no row.** The page is unchanged for anyone who hasn't chosen a time.
- A further-out card peeks like a match: hold it and swipe or tap to keep (decisions 0007, 0012). Its peek says "Via <match>" where a match says "Like <show>", since its reason is about that match.

## Consequences

- The 33% dead end becomes a row of finished shows under the limit, one step from what you liked. Show pages grow by 9 KB of HTML on average (16 KB at most) for the extra cards; 1,955 of 1,989 pages carry the row.
- Not every show has a second step that fits (a short finished show among very long ones). The row then stays away, as the first row's "None match" does today.
- `src/lib/further.ts` holds the choice, with tests.
