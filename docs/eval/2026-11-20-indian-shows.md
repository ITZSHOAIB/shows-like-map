# Eval: lesser-known Indian shows (2026-11-20)

Does match quality hold up beyond famous shows? Issue #2, slice "Eval in the repo".

## Setup

- **Lists:** Opus, 10 shows per call, the production prompt (`scripts/matches/generate.ts`).
- **Shows:** 15 lesser-known Indian series (Panchayat, Gullak, Kota Factory, Aspirants, Little Things, Permanent Roommates, Bandish Bandits, Hostel Daze, Tripling, Mismatched, Jamtara, Rocket Boys, Undekhi, Kudi Yedamaithe, Taj Mahal 1989). Baseline: 15 well-known global seeds (every 33rd of the 500), using their production lists.
- **Judge:** Gemini 3.5 Flash, blind (shuffled, unlabelled candidates), rating each shown pick 2 strong, 1 okay, 0 poor (`scripts/eval/judge.ts`).
- **Metric, fixed before the run:** precision at 5 = share of the shown top 5 rated 2. Target 0.85.

## Results

| | Indian | Global baseline |
|---|---|---|
| Strong at 5 (target 0.85) | **0.75** | 0.92 |
| Strong at 10 | 0.57 | 0.76 |
| Mean rating at 5 (0 to 2) | 1.72 | 1.92 |
| Picks found on TVmaze | 92% | 97% |

The global baseline matches the earlier Codex judge (0.95 strong at 5), so the gap is not a harsher judge.

## Spot-check

The owner reviewed the top 5 of Panchayat, Bandish Bandits, Little Things and Rocket Boys (20 picks). One was off: *Do You Like Brahms?* for Bandish Bandits, which the judge rated 1. The two picks the judge rated 0 (*Dupahiya*, *Saare Jahan Se Accha*, both 2025) were not flagged, so they look like gaps in the judge's knowledge of recent shows rather than bad picks.

## Verdict

The Indian set misses the metric (0.75 against 0.85), but by the human check 19 of 20 picks are fine. Most of the gap is picks the judge calls "okay" rather than "strong", plus recent shows it doesn't know. The weakest lists belong to shows with few close Indian analogues (Bandish Bandits, Little Things).
