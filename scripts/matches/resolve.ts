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

/** Picks that exist on TVmaze with a first-air year within one of the model's, minus the seed itself and repeats. */
export async function validate(seedId: number, picks: Pick[]): Promise<Valid[]> {
  const out: Valid[] = [];
  for (const p of picks) {
    const show = await resolve(p.title, p.year);
    if (!show || show.id === seedId || out.some((v) => v.show.id === show.id)) continue;
    if (p.year && show.year && Math.abs(show.year - p.year) > 1) continue;
    out.push({ ...p, show });
  }
  return out;
}
