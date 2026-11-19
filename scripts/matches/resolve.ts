// Map an AI pick (title + first-air year) to a TVmaze show, and drop picks that don't check out.
// Answers are cached in data/matches/resolve.json, keyed by "title|year".
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tvmaze } from "../tvmaze.ts";

export type Pick = { title: string; year: number | null; why: string };
export type Resolved = { id: number; name: string; year: number | null };
export type Valid = Pick & { show: Resolved };

const FILE = "data/matches/resolve.json";
const cache: Record<string, Resolved | null> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
const yearOf = (s: any) => Number(s.premiered?.slice(0, 4)) || null;
const norm = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** TVmaze's best text match is often a remake or spin-off, so among close matches prefer the right year,
 *  then the exact title, then the most-followed show. */
export async function resolve(title: string, year: number | null): Promise<Resolved | null> {
  const key = `${title}|${year ?? ""}`;
  if (!(key in cache)) {
    const hits: { score: number; show: any }[] = (await tvmaze(`/search/shows?q=${encodeURIComponent(title)}`)) ?? [];
    const close = hits.filter((h) => h.score >= (hits[0]?.score ?? 0) * 0.7);
    const rank = (s: any) => (year && yearOf(s) && Math.abs(yearOf(s)! - year) <= 1 ? 1000 : 0) + (norm(s.name) === norm(title) ? 500 : 0) + (s.weight ?? 0);
    const best = close.map((h) => h.show).sort((a, b) => rank(b) - rank(a))[0];
    cache[key] = best ? { id: best.id, name: best.name, year: yearOf(best) } : null;
    mkdirSync("data/matches", { recursive: true });
    writeFileSync(FILE, JSON.stringify(cache));
  }
  return cache[key];
}

const AKAS = "data/matches/akas.json";
const akaCache: Record<number, string[]> = existsSync(AKAS) ? JSON.parse(readFileSync(AKAS, "utf8")) : {};

/** TVmaze's search also matches on partial words, so "Scream" can land on Scream Queens. A hit counts only when it is
 *  the same title, the title with a possessive prefix or a subtitle ("Marvel's Daredevil", "Arcane: League of Legends"),
 *  or one of the show's other titles on TVmaze ("Goblin" for Guardian: The Lonely and Great God). */
export async function sameShow(title: string, show: Resolved): Promise<boolean> {
  const t = key(title);
  // The name, then the name without a possessive prefix, a series prefix, a subtitle, or a presenter.
  const names = [
    show.name,
    show.name.replace(/^[^:]*?['’]s\s+/, ""),
    show.name.replace(/^[^:]*:\s*/, ""),
    show.name.replace(/\s*(:|\s-\s).*$/, ""),
    show.name.replace(/\s+(with|by)\s+.*$/i, ""),
  ];
  if (names.some((n) => near(key(n), t))) return true;
  if (!(show.id in akaCache)) {
    akaCache[show.id] = ((await tvmaze(`/shows/${show.id}/akas`)) ?? []).map((a: any) => a.name);
    mkdirSync("data/matches", { recursive: true });
    writeFileSync(AKAS, JSON.stringify(akaCache));
  }
  return akaCache[show.id].some((a) => near(key(a), t));
}

/** A title for comparing: "&" is "and", no leading article, dots and apostrophes dropped ("Q.C." is "QC"). */
export const key = (t: string) => norm(t.replace(/&/g, " and ").replace(/[.'’]/g, "").replace(/ı/g, "i")).replace(/^(the|a) /, "");

/** Equal, or a spelling variant: one edit per ten characters ("Haikyu" and "Haikyuu"), never a different word. */
export function near(a: string, b: string) {
  if (a === b) return true;
  const limit = Math.floor(Math.max(a.length, b.length) / 10);
  if (!limit || Math.abs(a.length - b.length) > limit) return false;
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length] <= limit;
}

/** Picks that are the same show on TVmaze, with a first-air year within one of the model's, minus the seed itself and repeats. */
export async function validate(seedId: number, picks: Pick[]): Promise<Valid[]> {
  const out: Valid[] = [];
  for (const p of picks) {
    const show = await resolve(p.title, p.year);
    if (!show || show.id === seedId || out.some((v) => v.show.id === show.id)) continue;
    if (p.year && (!show.year || Math.abs(show.year - p.year) > 1)) continue;
    if (!(await sameShow(p.title, show))) continue;
    out.push({ ...p, show });
  }
  return out;
}
