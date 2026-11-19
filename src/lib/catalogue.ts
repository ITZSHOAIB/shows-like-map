// The show catalogue: one record per show, derived from TVmaze (CC BY-SA 4.0).
// scripts/catalogue.ts writes it; pages read it at build time.
import { existsSync, readFileSync } from "node:fs";

export type Status = "running" | "ended" | "uncertain" | "upcoming";

export interface Show {
  id: number; // TVmaze id
  slug: string;
  name: string;
  premiered: string | null; // YYYY-MM-DD
  ended: string | null;
  status: Status;
  platform: string | null;
  language: string | null;
  genres: string[];
  seasons: number;
  episodes: number;
  minutes: number | null; // total runtime of aired regular episodes, null when TVmaze has no runtimes: "hours to finish" is minutes / 60
  poster: string | null; // TVmaze CDN, hotlinked
  summary: string | null; // plain text
  tvmaze: string; // show page on TVmaze, for credit
}

interface Episode {
  season: number;
  type: string;
  runtime: number | null;
  airstamp: string | null;
}

const STATUS: Record<string, Status> = {
  Running: "running",
  Ended: "ended",
  "To Be Determined": "uncertain",
  "In Development": "upcoming",
};

/** Aired regular episodes only: specials and unaired episodes don't count toward finishing a show. */
export function aired(episodes: Episode[], now = new Date()): Episode[] {
  return episodes.filter((e) => e.type === "regular" && e.airstamp && new Date(e.airstamp) <= now);
}

/** Total minutes to watch every aired episode. Episodes without a runtime use the show's average; null if there's neither. */
export function minutesToFinish(episodes: Episode[], averageRuntime: number | null): number | null {
  if (averageRuntime === null && episodes.some((e) => e.runtime === null)) return null;
  return episodes.reduce((sum, e) => sum + (e.runtime ?? averageRuntime ?? 0), 0);
}

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

const plain = (html: string | null) => html?.replace(/<[^>]+>/g, "").trim() || null;

/** Turn a TVmaze show (fetched with `embed=episodes`) into a catalogue record. */
export function toShow(raw: any, now = new Date()): Show {
  const eps = aired(raw._embedded?.episodes ?? [], now);
  return {
    id: raw.id,
    slug: slugify(raw.name),
    name: raw.name,
    premiered: raw.premiered ?? null,
    ended: raw.ended ?? null,
    status: STATUS[raw.status] ?? "uncertain",
    platform: raw.webChannel?.name ?? raw.network?.name ?? null,
    language: raw.language ?? null,
    genres: raw.genres ?? [],
    seasons: new Set(eps.map((e) => e.season)).size,
    episodes: eps.length,
    minutes: minutesToFinish(eps, raw.averageRuntime ?? raw.runtime ?? null),
    poster: raw.image?.medium ?? null,
    summary: plain(raw.summary),
    tvmaze: raw.url,
  };
}

/** Give shows that share a name a year suffix so every slug is unique. */
export function uniqueSlugs(shows: Show[]): Show[] {
  const count = new Map<string, number>();
  for (const s of shows) count.set(s.slug, (count.get(s.slug) ?? 0) + 1);
  const seen = new Set<string>();
  return shows.map((s) => {
    let slug = count.get(s.slug)! > 1 && s.premiered ? `${s.slug}-${s.premiered.slice(0, 4)}` : s.slug;
    while (seen.has(slug)) slug = `${slug}-${s.id}`;
    seen.add(slug);
    return { ...s, slug };
  });
}

export const CATALOGUE = "src/data/generated/catalogue.json";

export function loadCatalogue(): Show[] {
  if (!existsSync(CATALOGUE)) throw new Error(`${CATALOGUE} is missing: run \`pnpm data\` first`);
  return JSON.parse(readFileSync(CATALOGUE, "utf8"));
}

export function hours(minutes: number): string {
  const h = minutes / 60;
  return h < 10 ? `${Math.round(h * 2) / 2} h` : `${Math.round(h)} h`;
}

export const STATUS_LABEL: Record<Status, string> = {
  running: "Ongoing",
  ended: "Ended",
  uncertain: "Future unclear",
  upcoming: "Not out yet",
};
