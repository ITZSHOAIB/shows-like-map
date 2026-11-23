# 14. Is it worth getting through? The payoff skyline

- **Status:** accepted, 2026-11-23
- **Deciders:** Sohab Sk

## Context

Hours to finish (decision 0004) say what a show costs. They don't say whether the hours pay off: whether it starts slow, peaks early, or ends badly. Epic #42 asked how to show that, and `docs/research/payoff-curve.md` (PR #43) set the thresholds.

TVmaze already rates most episodes. They come with the show call the catalogue makes anyway (`embed[]=episodes`), so the curve costs no new request.

On the `payoff-prototype` branch, charts, a running line and several metaphors were tried and dropped. The one picked was a **poster skyline**: every episode a building as tall as its rating, cut from the show's own poster.

## Decision

The show page gets a section, below the rows: **Is it worth getting through?**

- **Words first.** A plain verdict leads: the level (great, good, decent, weak), the shape (holds up, slow burn, peaks early, gets better, stumbles at the end) and the ending. Under the chart, three tiles give the numbers: when it gets good, the peak, and all of it (or where to stop). The words are the chart's text alternative, so the picture is never the only way in.
- **The skyline.** Each episode is a building as wide as its runtime and as tall as its rating. Every chart shares one window, 6 to 9.5. Seasons are blocks, with a street between them. Warming up and past its best are grey. The best season is lit amber and carries a star. A dashed line marks the typical show.
- **The poster.** The poster is the same cover the cards use: no backdrop and no extra pipeline step. Its full-size version loads only when the chart is near. The buildings are glass panes over it, with the whole picture faint behind them.
- **Tap a season** (or an episode, for a show with one season) to lift it and hear what it is. Each is a button with a full spoken name, and is reached by keyboard.
- **Arrival.** The city rises from the water, season by season, once. With reduced motion, or without JavaScript, it is already risen.
- **Not enough ratings** (under 80% of episodes rated, or fewer than 4 rated): it says so in one line, and draws nothing.
- **Anthologies** (Wikidata "anthology series", 31 shows) aren't judged as one arc. "Each season stands alone", and the best season is named.
- **Long runs.** Past 120 episodes, a building stands for a season, or for an even block of episodes when the show has one long season. The verdict still comes from every episode.
- **Seasons numbered by year** (One Piece, the soaps) are called by their year: "from 2005", not "from season 2005".

## Consequences

- The catalogue carries every episode's season, minutes and rating (`run`), and grows from about 2 MB to 5 MB. It is used at build time only: the browser's payloads pick their fields, so none of it ships.
- A page's skyline is at most about 50 KB of markup (5 KB gzipped).
- The section appears after the next data run on main. Until then the stored catalogue has no runs, and the page is unchanged.
- Ratings lean late: people who quit stop rating. So a rise needs a bigger gap than a drop to count.
- Fargo isn't tagged as an anthology on Wikidata, so it's judged as one arc.
