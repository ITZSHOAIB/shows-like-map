# 8. Home page: a wall of shows, and the time you have

- **Status:** accepted, 2026-11-20
- **Deciders:** Sohab Sk

## Context

Every journey on the site starts from a show you loved, but the home page was a placeholder with no way to name one. Epic #4 asked for the home page and search. The research in [#4](https://github.com/ITZSHOAIB/shows-like-map/issues/4#issuecomment-7039434254) found three things that matter:

- People choosing what to watch next give up quickly, and most fall back on something they already know. A page that asks them to think hard loses them.
- They recognise a poster faster than they recall and type a name, and on a phone they type with typos.
- Time is the reason they don't start a show, which is the site's promise (decision 0004).

Three candidates, kept on the `home-prototype` branch, were tried on a phone: **A** a search box and nothing else, **B** a wall of posters to tap, **C** the time you have first, then a short search. A felt empty, B didn't ask about time, and C made you answer before showing anything. A mix of B and C, **D**, won.

## Decision

The home page is a wall of well-known shows under "Tap one you loved", with a search box and the show page's time chips (Finished, Under 20 / 40 / 80 h) in a bar that sticks to the top.

- **The wall** starts with hand-picked shows that are well known and mostly finished, across languages, including the Indian shows the catalogue has. Then come the most popular shows, leaving out kids' shows, which the catalogue's popularity order would otherwise put first.
- **The chips are the show page's filters.** They read and write the same per-tab setting (`slm:filters`), so whatever you open lists matches that fit your time, and a filter set on a show page shows up on the home page. Tapping a chosen hour limit again turns it off; keyboard users have Clear.
- **Choosing an hour limit** adds a row of finished shows under it, to start one straight away. The row holds only finished shows under the limit, so its label is true.
- **The search** forgives typos ("braking bad"), takes initials ("got", "himym") and finds a show by its English title when the catalogue keeps the original ("money heist"). It runs in the browser over an index of every show (about 53 KB compressed), fetched the first time the search box gets focus. Results take the wall's place, and Enter opens the best one.
- One status line says what's going on: a hint, what your time will do, or how many shows the search found.
- Without JavaScript, the wall still works, and the search and chips are hidden.

## Consequences

- The fastest path is one tap on a familiar poster. Typing is the fallback, not the start.
- Picks are matched by name and year, so a pick missing from a new catalogue is skipped silently. `home.test.ts` checks the rules, not the list.
- Kids' shows are spotted by genre and network name. Carrying TVmaze's show type in the catalogue would do it properly (a #4 follow-up), as would TVmaze's English titles for the search instead of the few written in `search-index.ts`.
