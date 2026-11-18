// PROTOTYPE (open-data stack): turn the AI lists in data/open/ai into src/data/generated/open.json for the UI,
// each pick resolved to a TVmaze show (poster, link). TVmaze data is CC BY-SA 4.0; show details cached in data/open/tvmaze.
// Usage: node scripts/open/build-open.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, tvmaze } from "./tvmaze.ts";

const RESOLVED = "data/open/resolve-cache.json";
const resolved: Record<string, { id: number } | null> = existsSync(RESOLVED) ? JSON.parse(readFileSync(RESOLVED, "utf8")) : {};
mkdirSync("data/open/tvmaze", { recursive: true });

async function details(title: string, year: number | null) {
  const key = `${title}|${year ?? ""}`;
  if (!(key in resolved)) {
    const s = await resolve(title, year);
    resolved[key] = s ? { id: s.id } : null;
    writeFileSync(RESOLVED, JSON.stringify(resolved));
  }
  const id = resolved[key]?.id;
  if (!id) return null;
  const file = `data/open/tvmaze/${id}.json`;
  if (!existsSync(file)) writeFileSync(file, JSON.stringify(await tvmaze(`/shows/${id}`)));
  return JSON.parse(readFileSync(file, "utf8"));
}

const out = [];
for (const f of readdirSync("data/open/ai")) {
  const { seed, model, picks } = JSON.parse(readFileSync(`data/open/ai/${f}`, "utf8"));
  const items = [];
  for (const p of picks) {
    const s = await details(p.title, p.year);
    items.push({
      title: p.title, year: p.year, why: p.why,
      tvmaze: s && { id: s.id, name: s.name, url: s.url, poster: s.image?.medium ?? null, status: s.status, runtime: s.averageRuntime, rating: s.rating?.average ?? null },
    });
  }
  out.push({ seed, model, picks: items });
}
writeFileSync("src/data/generated/open.json", JSON.stringify(out));
console.log(`wrote src/data/generated/open.json: ${out.length} shows, ${out.reduce((n, o) => n + o.picks.length, 0)} picks`);
