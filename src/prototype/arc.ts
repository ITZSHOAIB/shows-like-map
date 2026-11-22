// PROTOTYPE (payoff-prototype branch, epic #42): how a show's quality moves across its run, from TVmaze's per-episode
// ratings. Throwaway: the thresholds are the research note's (docs/research/payoff-curve.md) and get tuned by eye here.

export interface RawEpisode {
  season: number;
  number: number | null;
  type: string;
  airstamp: string | null;
  runtime: number | null;
  rating: { average: number | null };
}

export interface Ep { season: number; number: number; rating: number | null; start: number; end: number } // hours in
export interface Season { n: number; mean: number | null; rated: number; eps: Ep[]; start: number; end: number }
export type Ending = "running" | "ended" | "cancelled" | "uncertain" | "upcoming";

export interface Arc {
  enough: boolean;
  episodes: Ep[];
  seasons: Season[];
  mean: number; // the show's own level: its rated episodes' average
  hours: number;
  best: Season | null; // only with two or more judged seasons
  slowStart: { season?: number; episode?: number; hours: number } | null; // where it gets going
  fadeAfter: { season: number; hours: number } | null; // strong up to here, then a lasting drop
  finale: "divides" | "strong" | null; // the final season (or episode, for one season) against the rest
  shape: string; // the named shape
  level: Level; // of the good part: a show that fades is judged by what it was before
  ending: Ending;
  verdict: string; // words first: also the chart's text alternative
}

type Level = "great" | "good" | "decent" | "weak";
// Where a show's average sits among the 1,196 with enough ratings: top quarter, above p40, above p15.
export const levelOf = (x: number): Level => (x >= 8.15 ? "great" : x >= 7.5 ? "good" : x >= 6.9 ? "decent" : "weak");

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const rated = (eps: Ep[]) => eps.flatMap((e) => (e.rating === null ? [] : [e.rating]));
export const round = (n: number) => Math.round(n * 10) / 10;
export const hoursLabel = (h: number) => (h < 1.5 ? `${Math.round(h * 60)} min` : `${Math.round(h)} h`);

// Season averages across the catalogue sit between 6.3 and 8.9 (p5–p95): a window every chart shares, so a flat show
// looks flat and a slide looks like a slide.
export const FLOOR = 6, CEIL = 9.5;

export function computeArc(raw: RawEpisode[], ending: Ending, anthology = false, averageRuntime: number | null = null, now = new Date()): Arc {
  let t = 0;
  const episodes: Ep[] = raw
    .filter((e) => e.type === "regular" && e.airstamp && new Date(e.airstamp) <= now && e.season > 0)
    .map((e) => {
      const start = t;
      t += (e.runtime ?? averageRuntime ?? 45) / 60;
      return { season: e.season, number: e.number ?? 0, rating: e.rating.average, start, end: t };
    });
  const all = rated(episodes);
  const seasons: Season[] = [...new Set(episodes.map((e) => e.season))].map((n) => {
    const eps = episodes.filter((e) => e.season === n);
    const r = rated(eps);
    return { n, eps, rated: r.length, mean: r.length >= 3 ? avg(r) : null, start: eps[0].start, end: eps.at(-1)!.end };
  });
  const enough = all.length >= 4 && all.length >= 0.8 * episodes.length;
  const mean = all.length ? avg(all) : 0;
  const judged = seasons.filter((s) => s.mean !== null);
  const base = { episodes, seasons, mean, hours: t, ending } as const;
  if (!enough) {
    return { ...base, enough, level: "weak", best: null, slowStart: null, fadeAfter: null, finale: null, shape: "", verdict: "Not enough episode ratings yet" };
  }

  const best = judged.length >= 2 ? judged.reduce((a, b) => (b.mean! > a.mean! ? b : a)) : null;
  const m = (ss: Season[]) => avg(ss.map((s) => s.mean!));

  // A slow start: a first season below the show's own level that a later one rises well clear of, or (for a short run)
  // a weak first few episodes. Rises need a bigger gap than drops: people who quit stop rating, so later seasons are flattered.
  let slowStart: Arc["slowStart"] = null;
  if (!anthology && judged.length >= 3 && judged[0].n === seasons[0].n && judged[0].mean! <= mean - 0.3
      && Math.max(...judged.slice(1).map((s) => s.mean!)) >= judged[0].mean! + 0.6) {
    const s = judged.find((s) => s.mean! >= mean - 0.05 && s !== judged[0])!;
    slowStart = { season: s.n, hours: s.start };
  } else if (!anthology) {
    const r = episodes.slice(0, 15);
    const early = rated(r.slice(0, 3)), settled = rated(r.slice(3));
    if (early.length === 3 && settled.length >= 3 && avg(settled) - avg(early) >= 0.4) {
      const from = r.findIndex((_, i) => i >= 3 && rated(r.slice(i, i + 3)).length > 0 && avg(rated(r.slice(i, i + 3))) >= avg(settled) - 0.1);
      const e = r[Math.max(from, 3)];
      slowStart = { episode: episodes.indexOf(e) + 1, hours: e.start };
    }
  }

  // A fade: the first season from which everything sits clearly below what came before. A drop that's only the last
  // season of a finished show is about its ending, not a place to stop.
  let fadeAfter: Arc["fadeAfter"] = null;
  if (!anthology && judged.length >= 3) {
    for (let k = 2; k < judged.length && !fadeAfter; k++) {
      const before = judged.slice(0, k), after = judged.slice(k);
      const lasting = after.every((s) => s.mean! <= m(before) - 0.3);
      if (lasting && m(before) - m(after) >= 0.5 && !(after.length === 1 && ending !== "running")) {
        fadeAfter = { season: before.at(-1)!.n, hours: before.at(-1)!.end };
      }
    }
  }

  // The ending, for a show that has one: its last episode against the show's own level, or a final season far below
  // the rest. After a fade the last season is measured against the faded part, so it isn't counted twice.
  let finale: Arc["finale"] = null;
  if (ending === "ended" && !anthology) {
    const last = episodes.at(-1)!.rating;
    const ref = fadeAfter ? judged.filter((s) => s.n > fadeAfter!.season) : judged;
    const lastSeason = judged.length >= 3 && ref.length >= 2 ? m(ref.slice(0, -1)) - ref.at(-1)!.mean! : 0;
    if ((last !== null && mean - last >= 1) || lastSeason >= 0.8) finale = "divides";
    else if (last !== null && last - mean >= 0.5) finale = "strong";
  }

  const range = judged.length >= 2 ? Math.max(...judged.map((s) => s.mean!)) - Math.min(...judged.map((s) => s.mean!)) : 0;
  const thirds = judged.length >= 3 ? m(judged.slice(-Math.ceil(judged.length / 3))) - m(judged.slice(0, Math.ceil(judged.length / 3))) : 0;
  const shape = anthology ? "Varies by season"
    : slowStart && fadeAfter ? "Slow start, then fades"
    : slowStart ? "Slow burn"
    : fadeAfter ? "Peaks early"
    : finale === "divides" ? "Stumbles at the end"
    : thirds >= 0.4 ? "Gets better"
    : range < 0.5 ? "Holds up"
    : "Ups and downs";

  const good = slowStart ? episodes.filter((e) => e.start >= slowStart.hours) : fadeAfter ? episodes.filter((e) => e.end <= fadeAfter.hours) : episodes;
  const level = levelOf(avg(rated(good)));
  const LEVEL: string = level;
  const where = (s?: number, e?: number) => (s ? `season ${s}` : `episode ${e}`);
  const words: string[] = [];
  if (anthology) words.push(best ? `Each season stands alone · best: season ${best.n}` : `Each season stands alone`);
  else if (slowStart && fadeAfter) words.push(`Slow start, ${LEVEL} from ${where(slowStart.season, slowStart.episode)}, fades after season ${fadeAfter.season}`);
  else if (slowStart) words.push(`Slow start, then ${LEVEL} from ${where(slowStart.season, slowStart.episode)}`);
  else if (fadeAfter) words.push(`${cap(LEVEL)} through season ${fadeAfter.season}, then fades`);
  else if (shape === "Holds up") words.push(`${cap(LEVEL)} all the way through`);
  else if (shape === "Gets better") words.push(`${cap(LEVEL)}, and gets better`);
  else words.push(`${cap(LEVEL)} overall`);
  words.push(endingWords(ending, finale));
  return { ...base, enough, level, best, slowStart, fadeAfter, finale, shape, verdict: words.join(" · ") };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function endingWords(ending: Ending, finale: Arc["finale"]): string {
  if (ending === "running") return "still running";
  if (ending === "cancelled") return "cancelled, so no proper ending";
  if (ending === "uncertain") return "its future is unclear";
  if (ending === "upcoming") return "not out yet";
  return finale === "divides" ? "ends, but the ending divides viewers" : finale === "strong" ? "ends on a high" : "ends properly";
}

/** A rolling average over `w` rated episodes either side: the line the eye should follow, not every bump. */
export function smooth(eps: Ep[], w = 3): { x: number; y: number }[] {
  const pts = eps.filter((e) => e.rating !== null);
  return pts.map((e, i) => {
    const win = pts.slice(Math.max(0, i - w), i + w + 1).filter((p) => p.season === e.season);
    return { x: (e.start + e.end) / 2, y: avg(win.map((p) => p.rating!)) };
  });
}
