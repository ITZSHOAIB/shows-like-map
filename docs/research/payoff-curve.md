# Payoff curve: research

*2026-11-22, for epic #42. Three research passes (viewers and prior art, decision psychology, visuals and motion) plus our own TVmaze data. Sources are linked inline; Reddit was read through mirrors and quoting articles.*

## The question

Before committing 20–80 hours, people ask a friend: *is it worth getting through?* This feature answers that from per-episode ratings, honestly and in a glance.

## What viewers actually ask

The same few questions come back on every forum:

- **"When does it get good?"** Maclean's calls it the standard reply to any multi-season recommendation ([Maclean's](https://macleans.ca/uncategorized/first-seasons-first/)).
- **"Does it get better? Should I push through?"** ([Babylon 5](https://boards.straightdope.com/t/babylon-5-does-it-get-better/386436?page=3), [The Office](https://boards.straightdope.com/t/does-the-office-get-any-better-after-the-first-season/561977), [The Leftovers](https://www.reddit.com/r/hbo/comments/1hd5kiq/))
- **"When should I stop?"** ([Dexter poll](https://forum.dvdtalk.com/tv-talk/617663-dexter-when-should-i-stop-watching.html), [BSG](https://gizmodo.com/when-to-stop-with-bsg-5491939))
- **"Does it end properly, or on a cliffhanger?"** ([Evil](https://www.reddit.com/r/EvilTV/comments/1lbbij3/), [TVmaze forum](https://www.tvmaze.com/threads/3599/reverie-canceled-worth-watching))

**The useful answers are positions, not praise.** For example: "late season 1", "by episode 10 you're hooked", "season 2 is the jumping-on point", "stop after season 4".

**Cancellation fear is real.** 46% of Americans sometimes wait for a show to end before starting it; 27% of those fear an unresolved cancellation ([YouGov 2023](https://yougov.com/en-us/articles/46361-the-threat-of-seeing-a-show-canceled-is-enough-to-discourage-two-in-five-americans-from-starting-to-watch)). 56% are fine quitting partway, while 31% feel they must finish ([YouGov 2018](https://yougov.com/en-us/daily-results/20180425-954c1-2)).

**Nobody is hooked by the pilot.** Netflix found hooks land at episodes 2–8 ([Netflix](https://about.netflix.com/en/news/do-you-know-when-you-were-hooked-netflix-does)). Most shows take 6–7 episodes to reach their own average ([Stat Significant](https://www.statsignificant.com/p/how-many-episodes-should-you-watch)).

## What exists, and the gap

Several tools chart episode ratings:

- Graph TV (scatter with season trend lines)
- SeriesHeat (season × episode heatmap)
- [Series Graph](https://seriesgraph.com/) (mobile graphs and heatmaps; the closest competitor)
- [RatinGraph](https://ratingraph.com/)
- a Jellyfin plugin (a heatmap folded away to avoid spoilers)

**Every one stops at the chart** and leaves the reader to interpret it. None gives a plain-words verdict, ties it to hours, or says whether the show ends or was cancelled. jumptheshark.com, which proved people want to name the moment a show went bad, is gone.

## What psychology says

1. **Peak and end, not average.** A show is remembered by its best stretch and its ending; length barely counts ([Fredrickson & Kahneman 1993](https://bear.warrington.ufl.edu/brenner/mar7588/Papers/fredr-kahneman-jpsp1993.pdf)). So *best season* and *how it ends* are the headline facts.
2. **Permission to stop beats sunk cost.** People keep going so they don't "waste" what they've spent ([Arkes & Blumer 1985](https://cognition.aau.at/bg/BA/Arkes%20%26%20Blumer%201985.pdf)). "Seasons 1–4 are the strong part (38 h)", said up front, turns quitting into finishing.
3. **Words first, numbers second.** Labels help people use quality data ([Peters et al. 2009](https://research.chalmers.se/en/publication/100926)). People sort ratings into good and bad bins and over-read small differences ([binary bias](https://pollux-fid.de/r/cr-10.1093/jcr/ucy017)). 8.1 vs 8.3 must never "talk".
4. **No truncated axes.** A zoomed-in axis exaggerates differences even for viewers who know it's zoomed ([Correll et al. 2020](https://www.tableau.com/research/publications/truncating-y-axis-threat-or-menace)).
5. **Explain with content, not crowds.** "Strong from season 2" helps people predict their own taste; "fans loved it" only persuades ([Bilgic & Mooney](https://typeset.io/pdf/explaining-recommendations-satisfaction-vs-promotion-2d2ihbomvq.pdf), [Tintarev & Masthoff](https://abdn.elsevierpure.com/files/20864620/USER700.pdf)).
6. **Say bad news as plainly as good**, and admit when there's too little data. A verdict that's never negative isn't trusted.
7. **Anticipation is honest delight.** "It gets going around episode 4" gives something to look forward to ([Kumar et al. 2014](https://www.psychologicalscience.org/journals/psychological-science/0956797614546556/)). Knowing quality isn't a spoiler ([Leavitt & Christenfeld 2011](https://www.psychologicalscience.org/journals/psychological-science/0956797611417007/)), but plot is.
8. **People think in story shapes** (rises, falls, late payoffs) ([Reagan et al. 2016](https://arxiv.org/abs/1606.07772)). A few named shapes read faster than numbers.
9. **Animate only when it shows something,** briefly, once. The final frame must stand on its own ([Heer & Robertson 2007](https://idl.uw.edu/papers/animated-transitions), [Tversky et al. 2002](https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf)). Under 500 ms ([NN/g](https://nngroup.com/articles/animation-duration)), and nothing moves under reduced motion.
10. **About three detailed looks per session.** People give up after about 60–90 s ([Gomez-Uribe & Hunt 2015](https://gwern.net/doc/reinforcement-learning/exploration/2015-gomezuribe.pdf)), so the verdict must read in about 2 seconds.

## Our data (TVmaze, catalogue of 1,989 shows)

- **1,193 shows (60%)** have at least 80% of their episodes rated. Of these, 893 have two or more seasons with at least 3 rated episodes. Indian shows: 7 of 196.
- **Differences are small:** the median gap between a show's best and worst season is 0.65 points (p75 1.05, p90 1.52). 555 shows have a gap of 0.5 or more; 248 have 1.0 or more.
- **Slow starts:** 220 shows rate their episodes 4–15 at least 0.4 above their first three.
- **Season ratings across all shows:** p5 6.29, median 7.72, p95 8.94. So a shared 6–9.5 window shows about 95% of seasons without flattening them (0–10 would) or exaggerating them (a window fitted to each show would). The two research passes disagreed on this; the data settles it.
- **It matches what fans say:**

  | Show | Season ratings |
  |---|---|
  | Parks and Recreation | 7.5 → 8.6 (peak S3) |
  | Star Trek: TNG | 7.3, 7.5 → 8.0 from S3 |
  | Game of Thrones | S8 6.5 |
  | How I Met Your Mother | 8.4 → 6.9 |
  | House of Cards | 7.9 → 5.4 |
  | The Wire | slow first three episodes |

- **How it ends** is already in our AI lists (`ending`): planned 1,042, cancelled 622, ongoing 195, unsure 134. TVmaze's "Ended" can't tell a planned ending from a cancellation; this field can.

## Pitfalls, and the rules that answer them

| Pitfall | Rule |
|---|---|
| **People who quit stop rating**, so late seasons are rated by fans ([SpoilerTV](https://spoilertv.com/2014/09/do-tv-series-get-better-or-worse-over.html)) | Drops count at a lower threshold than rises. A late season as high as early ones means "fans still rate it well", not proof it holds up |
| **Few votes, and no vote counts** (TVmaze shows a rating after 3 votes) | Require most episodes rated and at least 3 per season; smooth; otherwise show nothing |
| **Pilots and finales are special**: every genre rises, plateaus, declines, then rebounds at the finale ([The Ringer](https://www.theringer.com/2018/07/31/tv/when-do-tv-shows-peak)) | Never judge "gets going" from the pilot; judge the ending separately |
| **One-off filler dips** | A drop must persist, e.g. most of a season below the show's own level, not one bad episode |
| **Anthologies** (True Detective, Black Mirror) | Rank seasons ("Best: season 1"), never "drops after" |
| **Review bombing** (GoT S8) | It's still the signal people want; say "divides viewers" for extreme finales |

## Representations considered

| Concept | Verdict |
|---|---|
| **Season bars** around the show's own average, best marked ★ | Familiar, tappable, works to about 12 seasons. A strong default |
| **Sparkline** (word-sized) | For the peek card: verdict plus a tiny line |
| **Hours road**: x-axis is hours watched, with a shaded "worth it" stretch and flags ("gets going, 3 h in", "dips after S4") | The only view that answers "is it worth my time". Ours alone, since nobody else has hours |
| **Episode heatmap** (SeriesHeat style) | Fans know it, but it relies on colour and gives no verdict. An optional deeper layer |
| **Story cards** (Wrapped style: start, peak, ending) | Bold, shareable, possibly too much. Only as an opt-in "tell me the arc" |
| Rings, EKG line, mountain silhouette | Rejected: rings are poor for time, EKG makes noise look dramatic, silhouettes are decoration |

**Build:** an SVG drawn at build time in an Astro component (about 0 KB of JS), using d3-scale and d3-shape at build only (`curveMonotoneX` doesn't invent peaks). A small script handles the scrub, which is also a keyboard slider (APG pattern, `aria-valuetext` "Season 4, best season"). A `<details>` table carries the full data for screen readers.

**Colour:** amber above the show's own average, cool grey below, ★ and labels so colour is never the only signal. System colours in forced-colours mode.

**Motion:** a single 400–600 ms draw-on, a season-to-episodes expand of about 250 ms, and the peek sparkline morphing into the show-page chart through view transitions (as the poster already does). Instant under reduced motion.

## Layers

1. **Card or peek:** one verdict line ("Slow start, then great · ends properly"), optionally a sparkline.
2. **Show page:** the verdict, the picture, best season, how it ends, the hours to the good part, and the stopping point if any.
3. **On demand:** episode detail, the data table.

## Open questions

- Which picture leads on the show page: season bars or the hours road?
- Do cards get a verdict word or tag ("Gets better", "Fades")? Cards are already busy.
- Should the named shapes ("Slow burn", "Holds up", "Peaks early", "Strong finish") also become a filter?
- What do shows with too little data (40%, almost all Indian shows) show: nothing, or "not enough ratings yet"?
