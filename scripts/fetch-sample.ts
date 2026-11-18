// PROTOTYPE data fetch: a small, coherent slice of TMDB TV for the UI prototypes.
// Top ~2,000 shows by popularity plus Indian shows with 5+ votes.
// Raw responses are cached in data/cache (git-ignored: TMDB data is never committed).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const TOKEN = process.env.TMDB_API_KEY;
if (!TOKEN) throw new Error("TMDB_API_KEY is not set");

const API = "https://api.themoviedb.org/3";
const CACHE = "data/cache/tv";
const TOP_N = Number(process.env.SAMPLE_TOP ?? 2000);
const APPEND = "keywords,aggregate_credits,content_ratings,watch/providers";

mkdirSync(CACHE, { recursive: true });

async function get(path: string, tries = 4): Promise<any> {
  for (let t = 0; t < tries; t++) {
    const res = await fetch(API + path, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** t));
  }
  return null;
}

async function exportIds(): Promise<{ id: number; popularity: number }[]> {
  const file = "data/cache/tv_series_ids.json";
  if (!existsSync(file)) {
    // The daily export is published around 08:00 UTC; yesterday's is always there.
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    const stamp = `${String(d.getUTCMonth() + 1).padStart(2, "0")}_${String(d.getUTCDate()).padStart(2, "0")}_${d.getUTCFullYear()}`;
    const res = await fetch(`https://files.tmdb.org/p/exports/tv_series_ids_${stamp}.json.gz`);
    if (!res.ok) throw new Error(`export download failed: ${res.status}`);
    const lines = gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8").trim().split("\n");
    writeFileSync(file, JSON.stringify(lines.map((l) => JSON.parse(l))));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

async function indianIds(): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; page <= 25; page++) {
    const d = await get(`/discover/tv?with_origin_country=IN&vote_count.gte=5&sort_by=popularity.desc&page=${page}`);
    if (!d?.results?.length) break;
    ids.push(...d.results.map((r: { id: number }) => r.id));
    if (page >= d.total_pages) break;
  }
  return ids;
}

const top = (await exportIds()).sort((a, b) => b.popularity - a.popularity).slice(0, TOP_N).map((r) => r.id);
const ids = [...new Set([...top, ...(await indianIds())])];
const todo = ids.filter((id) => !existsSync(`${CACHE}/${id}.json`));
console.log(`${ids.length} shows, ${todo.length} to fetch`);

let done = 0;
async function worker() {
  while (todo.length) {
    const id = todo.pop()!;
    const show = await get(`/tv/${id}?language=en-US&append_to_response=${APPEND}`);
    if (show) writeFileSync(`${CACHE}/${id}.json`, JSON.stringify(show));
    if (++done % 250 === 0) console.log(`  ${done} fetched`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
writeFileSync("data/cache/sample-ids.json", JSON.stringify(ids));
console.log("done");
