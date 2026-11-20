// Search (#4, decision 0008): a forgiving match over the index of every show (search-index.ts), run in the browser.
// People type on a phone, so it takes typos ("braking bad"), initials ("got") and the English title of a show the
// catalogue keeps under its original one ("money heist").
import type { Status } from "./catalogue";

export const POSTERS = "https://static.tvmaze.com/uploads/images/medium_portrait/";

/** One show in the index, smallest first: slug, name, year, status, hours to finish ("62 h"), poster path, other names. */
export type Entry = [slug: string, name: string, year: string, status: Status, hours: string | null, poster: string, also: string[]];

/** Lower case, no accents, "&" as "and", and anything else that isn't a letter or digit as one space. */
export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Edit distance between two strings, giving up once it's past `max`. */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...cur) > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well a normalised query fits a normalised name, from 100 (the name itself) down to 0 (not at all). */
export function score(q: string, name: string) {
  if (name === q) return 100;
  // Initials, as people shorten them (got, himym): a full match beats a name that merely starts with the letters.
  if (q.length >= 3 && !q.includes(" ") && name.split(" ").map((w) => w[0]).join("") === q) return 95;
  if (name.startsWith(q)) return 90;
  if (name.replace(/^the /, "").startsWith(q)) return 88;
  if ((" " + name).includes(" " + q)) return 75;
  if (q.length >= 3 && name.includes(q)) return 60;
  // A typo: a near miss from the start of any word, one slip in a short query and two in a long one.
  const tol = q.length < 4 ? 0 : q.length < 8 ? 1 : 2;
  let best = 0;
  for (let i = 0; tol && i < name.length; i++) {
    if (i > 0 && name[i - 1] !== " ") continue;
    for (const len of [q.length - 1, q.length, q.length + 1]) {
      const d = distance(q, name.slice(i, i + len), tol);
      if (d <= tol) best = Math.max(best, 50 - d * 10 - (i ? 5 : 0));
    }
  }
  return best;
}

export interface Searchable { entry: Entry; names: string[]; rank: number }

/** The index ready to search; its order is the catalogue's, most popular first, which breaks ties. */
export const prepare = (entries: Entry[]): Searchable[] => entries.map((entry, rank) => ({ entry, rank, names: [entry[1], ...entry[6]].map(norm) }));

/** The best `limit` shows for what was typed, best first. */
export function search(index: Searchable[], typed: string, limit: number): Entry[] {
  const q = norm(typed);
  if (!q) return [];
  return index
    .map((s) => ({ s, score: Math.max(...s.names.map((n) => score(q, n))) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.rank - b.s.rank)
    .slice(0, limit)
    .map((x) => x.s.entry);
}
