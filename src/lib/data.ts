// Server-side access to the generated show data (read from disk, never bundled).
import { readFileSync } from "node:fs";
import type { M } from "./explore";

export type Status = "ended" | "cancelled" | "ongoing";
export interface Similar { id: number; score: number; reasons: string[]; shared: string[] }
export interface Show {
  id: number; slug: string; name: string; original: string | null; year: number | null;
  status: Status; seasons: number | null; episodes: number | null; hours: number | null;
  poster: string | null; backdrop: string | null; overview: string; lang: string;
  genres: string[]; providers: { name: string; logo: string }[]; popularity: number;
  rating: { avg: number; votes: number } | null; // TMDB user score
  similar: Similar[];
}

const data: { features: Record<string, string>; shows: Show[] } = JSON.parse(
  readFileSync(new URL("../data/generated/shows.json", import.meta.url), "utf8"),
);

export const shows = data.shows;
export const byId = new Map(shows.map((s) => [s.id, s]));
export const bySlug = new Map(shows.map((s) => [s.slug, s]));

export const IMG = "https://image.tmdb.org/t/p/";
export const poster = (path: string | null, size: "w92" | "w185" | "w342" | "w500" = "w185") =>
  path ? `${IMG}${size}${path}` : null;

export const STATUS_LABEL: Record<Status, string> = { ended: "✓ Ended", cancelled: "⚠ Cancelled", ongoing: "● Ongoing" };

export type ReasonType = "k" | "c" | "g" | "n" | "p";
export const featureLabel = (key: string) => data.features[key] ?? "";
export function reasonText(key: string): string {
  const label = featureLabel(key);
  switch (key[0] as ReasonType) {
    case "c": return `by ${label}`;
    case "n": return `on ${label}`;
    case "p": return `with ${label}`;
    default: return label;
  }
}

export function lengthLabel(s: Show): string {
  const parts = [];
  if (s.seasons) parts.push(`${s.seasons} season${s.seasons > 1 ? "s" : ""}`);
  if (s.hours) parts.push(`${s.hours} h`);
  return parts.join(" · ");
}

/** Everything a filter needs, as data attributes on a hop target. */
export const filterAttrs = (s: Show) => ({
  "data-status": s.status,
  "data-hours": s.hours ?? "",
  "data-providers": s.providers.map((p) => p.name).join("|"),
  "data-lang": s.lang,
});

export const matches = (s: Show) => s.similar.map((m) => ({ ...m, show: byId.get(m.id)! })).filter((m) => m.show);

/** TMDB user score, only once enough people have voted for it to mean something. */
export const showRating = (s: Show) => (s.rating && s.rating.votes >= 20 ? s.rating.avg : null);
export const votesLabel = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

/** The compact match shape the Drill down prototype renders (see lib/explore.ts). */
export const toM = (s: Show, reasons: string[] = []): M => ({
  id: s.id, slug: s.slug, name: s.name, year: s.year, poster: s.poster, status: s.status,
  hours: s.hours, seasons: s.seasons, lang: s.lang, rating: showRating(s),
  prov: s.providers.map((p) => [p.name, p.logo]),
  why: reasons.map((r) => [r[0], reasonText(r)]),
});

// ---- open-data slice: AI-picked matches for the eval shows (scripts/open/build-open.ts) ----
type OpenPick = { title: string; year: number | null; why: string;
  tvmaze: { id: number; name: string; url: string; poster: string | null; status: string; runtime: number | null; rating: number | null } | null };
const OPEN_FILE = new URL("../data/generated/open.json", import.meta.url);
const open: { seed: { name: string; year: number | null }; picks: OpenPick[] }[] = (() => {
  try { return JSON.parse(readFileSync(OPEN_FILE, "utf8")); } catch { return []; }
})();
const normName = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** A catalog show with this title (or original title) and a first-air year within a year of the given one. */
function findShow(title: string, year: number | null) {
  const n = normName(title);
  return shows.find((s) => (normName(s.name) === n || (s.original && normName(s.original) === n)) && (!year || !s.year || Math.abs(s.year - year) <= 1));
}

/** The AI picks for a show, if it's one of the open-data slice's seeds. Picks in the catalog hop like any card. */
export function aiPicks(show: Show): M[] | null {
  const entry = open.find((o) => findShow(o.seed.name, o.seed.year)?.id === show.id);
  if (!entry) return null;
  return entry.picks.map((p, i): M => {
    const s = findShow(p.title, p.year) ?? (p.tvmaze ? findShow(p.tvmaze.name, p.year) : undefined);
    if (s) return { ...toM(s), why: [["ai", p.why]] };
    const t = p.tvmaze;
    return {
      id: -(t?.id ?? i), slug: "", name: t?.name ?? p.title, year: p.year, poster: null,
      status: t?.status === "Ended" ? "ended" : "ongoing", hours: null, seasons: null, lang: "", rating: t?.rating ?? null,
      prov: [], why: [["ai", p.why]], img: t?.poster ?? undefined, href: t?.url ?? `https://www.tvmaze.com/search?q=${encodeURIComponent(p.title)}`,
    };
  });
}

/** "Closest matches", then up to 6 rows named after a shared reason (creators, then keywords, cast, networks). */
export function reasonRows(show: Show) {
  const ms = matches(show);
  const PRIORITY: Record<string, number> = { c: 4, k: 3, p: 2, n: 1, g: 0 };
  const counts = new Map<string, number>();
  for (const m of ms) for (const f of m.shared) counts.set(f, (counts.get(f) ?? 0) + 1);
  const picked = [...counts]
    .filter(([f, n]) => n >= 3 && f[0] !== "g")
    .sort((a, b) => PRIORITY[b[0][0]] - PRIORITY[a[0][0]] || b[1] - a[1])
    .slice(0, 6)
    .map(([f]) => f);
  if (picked.length < 4) {
    picked.push(...[...counts].filter(([f, n]) => f[0] === "g" && n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 4 - picked.length).map(([f]) => f));
  }
  const title = (f: string) => {
    const l = featureLabel(f);
    return { c: `Made by ${l}`, k: `Because it's about ${l}`, p: `Starring ${l}`, n: `More from ${l}`, g: `More ${l}` }[f[0]] ?? l;
  };
  return [
    { key: "best", label: "Closest", title: "Closest matches", items: ms.slice(0, 14) },
    ...picked.map((f) => ({ key: f, label: featureLabel(f), title: title(f), items: ms.filter((m) => m.shared.includes(f)) })),
  ];
}
