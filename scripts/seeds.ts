import type { PackedList } from "../src/lib/matches.ts";

// Seed selection: which TVmaze shows start the catalogue (decisions in #1), and the ring their matches add (#2).
// Global first: rank by Wikidata sitelinks, the number of Wikipedia language editions with an article on the show.
// TVmaze's own `weight` tracks what's airing now, so it buries finished classics.

export const TYPES = new Set(["Scripted", "Animation", "Documentary"]);

// Preschool and kids' TV isn't what someone choosing their next series is after. Family shows (The Simpsons) stay.
const eligible = (s: any) => TYPES.has(s.type) && !s.genres?.includes("Children") && s.status !== "In Development" && s.premiered;

export function selectSeeds(index: any[], sitelinks: Record<number, number>, count = 500): number[] {
  return index
    .filter((s) => eligible(s) && sitelinks[s.id])
    .sort((a, b) => sitelinks[b.id] - sitelinks[a.id] || (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, count)
    .map((s) => s.id);
}

/** One ring (decision in #2): the eligible shows among each seed page's `shown` validated picks. Only seed lists
 *  count, so the ring's own lists never pull in a second ring. */
export function ringIds(seeds: number[], lists: PackedList[], index: any[], shown = 10): number[] {
  const isSeed = new Set(seeds);
  const ok = new Set(index.filter(eligible).map((s) => s.id));
  const ring = new Set<number>();
  for (const list of lists.filter((l) => isSeed.has(l.id))) {
    for (const p of list.picks.filter((p) => p.tvmaze).slice(0, shown)) if (!isSeed.has(p.tvmaze!.id) && ok.has(p.tvmaze!.id)) ring.add(p.tvmaze!.id);
  }
  return [...ring];
}
