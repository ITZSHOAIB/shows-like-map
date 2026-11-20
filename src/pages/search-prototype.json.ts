// PROTOTYPE (home-prototype branch, #4): the search index the home page variants fetch when the search box is first
// focused. One row per show, smallest first: [slug, name, year, status, hours, poster path, other names].
import type { APIRoute } from "astro";
import { loadCatalogue } from "../lib/catalogue";

const POSTERS = "https://static.tvmaze.com/uploads/images/medium_portrait/";
// The catalogue keeps original titles; a few are better known in English. The real build needs English AKAs from
// TVmaze in the catalogue (data/matches/akas.json covers 364 shows and isn't in the build).
const ALSO: Record<string, string[]> = {
  "La Casa de Papel": ["Money Heist"],
  "The Office|2005": ["The Office (US)"],
  "The Office|2001": ["The Office (UK)"],
};

export const GET: APIRoute = () => {
  const rows = loadCatalogue().map((s) => {
    const year = s.premiered?.slice(0, 4) ?? "";
    const also = ALSO[`${s.name}|${year}`] ?? ALSO[s.name] ?? [];
    const poster = s.poster?.startsWith(POSTERS) ? s.poster.slice(POSTERS.length) : (s.poster ?? "");
    return [s.slug, s.name, year, s.status, s.minutes === null ? null : Math.round(s.minutes / 60), poster, also];
  });
  return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" } });
};
