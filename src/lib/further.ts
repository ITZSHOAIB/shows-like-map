// "A step further out" (#3/#4): when your time or "finished" filter leaves a show's own matches thin, the shows its matches
// lead to fill the gap. A third of shows have no match that's finished and under 20 h (measured), so the filter promise
// would otherwise end in an empty row.
import type { Show } from "./catalogue";
import { HOUR_LIMITS, isFinished } from "./filters.ts";
import type { Match } from "./matches";

export interface Further {
  match: Match;
  show: Show;
  /** The match of this show that leads here: "Via Better Call Saul". */
  via: string;
}

/** How many to keep for each filter that can be chosen, so every filter finds some. */
const PER_FILTER = 8;

/**
 * Shows two steps away, best first. A show scores higher the more of this show's matches list it, then the higher
 * those matches rank. Direct matches and the show itself are left out (they're in the first row). The pool holds the
 * best few for each filter (finished, and finished under each hour limit), so any filter the visitor picks finds some;
 * CSS then hides what the chosen filter doesn't pass.
 */
export function furtherOut(show: Show, own: Match[], matchesOf: Map<number, Match[]>, byId: Map<number, Show>): Further[] {
  const seen = new Set([show.id, ...own.map((m) => m.id)]);
  const found = new Map<number, Further & { score: number }>();
  own.forEach((via, i) => {
    if (!byId.has(via.id)) return;
    (matchesOf.get(via.id) ?? []).forEach((m, j) => {
      const target = byId.get(m.id);
      if (!target || seen.has(m.id)) return;
      const score = 1 + 1 / (1 + i + j); // each listing counts, an early one by an early match counts a little more
      const prior = found.get(m.id);
      if (prior) prior.score += score;
      else found.set(m.id, { match: m, show: target, via: via.name, score });
    });
  });
  const ranked = [...found.values()].sort((a, b) => b.score - a.score || a.show.name.localeCompare(b.show.name));
  const under = (h: number) => (f: Further) => f.show.minutes !== null && f.show.minutes < h * 60;
  const picks = new Set<Further>();
  for (const pass of [isFinishedFurther, ...HOUR_LIMITS.map((h) => (f: Further) => isFinishedFurther(f) && under(h)(f))])
    ranked.filter(pass).slice(0, PER_FILTER).forEach((f) => picks.add(f));
  return ranked.filter((f) => picks.has(f)).map(({ match, show, via }) => ({ match, show, via }));
}

const isFinishedFurther = (f: Further) => isFinished(f.show);
