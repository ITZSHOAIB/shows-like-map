// The search index (#4): every show as a compact entry, written at build time to /search.json. Kept apart from
// search.ts, which runs in the browser and can't load the catalogue.
import { hours, type Show } from "./catalogue.ts";
import { POSTERS, type Entry } from "./search.ts";

// The catalogue keeps original titles. Until it carries TVmaze's English AKAs (#4 follow-up), the best-known ones are
// here, keyed by name, or name|year where two shows share a name.
const ALSO: Record<string, string[]> = {
  "La Casa de Papel": ["Money Heist"],
  "The Office|2005": ["The Office (US)"],
  "The Office|2001": ["The Office (UK)"],
  "Слуга народа": ["Servant of the People"],
};

export function entryOf(s: Show): Entry {
  const year = s.premiered?.slice(0, 4) ?? "";
  const poster = s.poster?.startsWith(POSTERS) ? s.poster.slice(POSTERS.length) : (s.poster ?? "");
  return [s.slug, s.name, year, s.status, s.minutes === null ? null : hours(s.minutes), poster, ALSO[`${s.name}|${year}`] ?? ALSO[s.name] ?? [], s.rating ?? null];
}
