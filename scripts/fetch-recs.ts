// PROTOTYPE: TMDB's own recommendations for every cached show (2 pages, ~40 each), cached in data/cache/recs.
// Used two ways: as a baseline in scripts/eval-similar.ts, and as a "watched together" signal in build-similar.ts.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

const TOKEN = process.env.TMDB_API_KEY;
if (!TOKEN) throw new Error("TMDB_API_KEY is not set");

const API = "https://api.themoviedb.org/3";
const OUT = "data/cache/recs";
mkdirSync(OUT, { recursive: true });

async function get(path: string, tries = 4): Promise<any> {
  for (let t = 0; t < tries; t++) {
    const res = await fetch(API + path, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" } });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** t));
  }
  return null;
}

const todo = readdirSync("data/cache/tv").map((f) => Number(f.replace(".json", ""))).filter((id) => !existsSync(`${OUT}/${id}.json`));
console.log(`${todo.length} to fetch`);
let done = 0;
async function worker() {
  while (todo.length) {
    const id = todo.pop()!;
    const ids: number[] = [];
    for (let page = 1; page <= 2; page++) {
      const d = await get(`/tv/${id}/recommendations?language=en-US&page=${page}`);
      ids.push(...(d?.results ?? []).map((r: { id: number }) => r.id));
      if (!d || page >= d.total_pages) break;
    }
    writeFileSync(`${OUT}/${id}.json`, JSON.stringify(ids));
    if (++done % 300 === 0) console.log(`  ${done} fetched`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log("done");
