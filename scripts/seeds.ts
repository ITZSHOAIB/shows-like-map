// Seed selection: which TVmaze shows start the catalogue (decisions in #1).
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
