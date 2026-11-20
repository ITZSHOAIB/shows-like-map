// The home page's shows (#4, decision 0008): a wall of well-known shows to tap one you loved, and for each time limit
// a row of finished shows that fit it.
import type { Show } from "./catalogue";
import { HOUR_LIMITS, isFinished } from "./filters.ts";

// Picked by hand: well known, mostly finished, a spread of languages, and the Indian shows the catalogue has (global
// first, India next). The catalogue's own order starts with long kids' cartoons, which don't sell "one you'll finish".
export const PICKS = [
  "Breaking Bad|2008", "Dark|2017", "Squid Game|2021", "Panchayat|2020", "Chernobyl|2019", "La Casa de Papel|2017",
  "Fleabag|2016", "Crash Landing on You|2019", "The Office|2005", "Stranger Things|2016", "The Queen's Gambit|2020",
  "The Railway Men: The Untold Story of Bhopal 1984|2023", "Sherlock|2010", "MINDHUNTER|2017", "Normal People|2020", "Game of Thrones|2011",
];

/** How many shows the wall holds: enough to recognise a few, few enough to scroll past. */
export const WALL = 36;
/** How many shows a time row holds. */
export const ROW = 12;

// Kids' shows: TVmaze genres rarely say so, but their networks do. The catalogue should carry TVmaze's show type
// instead (#4 follow-up).
const KIDS = /^(Disney|Nick|Cartoon Network|Boomerang|PBS Kids|CBBC|CBeebies|Treehouse|YTV|Discovery Family|Universal Kids)/;
export const forGrownUps = (s: Show) => !s.genres.some((g) => g === "Children" || g === "Family") && !KIDS.test(s.platform ?? "");

const key = (s: Show) => `${s.name}|${s.premiered?.slice(0, 4) ?? ""}`;

/** The picks found in the catalogue, in their order. */
export const picksIn = (catalogue: Show[]) => PICKS.flatMap((k) => catalogue.find((s) => key(s) === k) ?? []);

/** The wall: the picks, then the most popular grown-up shows. */
export function wallOf(catalogue: Show[]): Show[] {
  const picks = picksIn(catalogue);
  return [...new Set([...picks, ...catalogue.filter(forGrownUps)])].slice(0, WALL);
}

/** For each hour limit, finished grown-up shows under it: picks first, then the most popular. */
export function rowsOf(catalogue: Show[]): Record<(typeof HOUR_LIMITS)[number], Show[]> {
  const order = [...new Set([...picksIn(catalogue), ...catalogue])];
  const fits = (h: number) => (s: Show) => isFinished(s) && forGrownUps(s) && s.minutes !== null && s.minutes < h * 60;
  return Object.fromEntries(HOUR_LIMITS.map((h) => [h, order.filter(fits(h)).slice(0, ROW)])) as Record<(typeof HOUR_LIMITS)[number], Show[]>;
}
