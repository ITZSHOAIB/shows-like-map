// Build the show catalogue from TVmaze into src/data/generated/catalogue.json.
// Raw responses are cached in data/tvmaze (git-ignored); delete the folder to refetch everything.
// Usage: pnpm data            seeds from TVmaze's full show index (about 400 pages) ranked by Wikidata sitelinks, then one call per show
//        pnpm data 47014 ...  only these TVmaze ids
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { CATALOGUE, toShow, uniqueSlugs } from "../src/lib/catalogue.ts";
import { selectSeeds } from "./seeds.ts";
import { tvmaze } from "./tvmaze.ts";
import { detailsByTvmaze, sitelinksByTvmaze } from "./wikidata.ts";

const CACHE = "data/tvmaze";

async function cached(file: string, path: string) {
  if (!existsSync(file)) {
    const json = await tvmaze(path);
    if (json === null) return null;
    writeFileSync(file, JSON.stringify(json));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

async function sitelinks() {
  const file = "data/wikidata/sitelinks.json";
  if (!existsSync(file)) {
    mkdirSync("data/wikidata", { recursive: true });
    writeFileSync(file, JSON.stringify(await sitelinksByTvmaze()));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Wikidata id, English Wikipedia article and creators per TVmaze id; only ids not cached yet are queried. */
async function wikidata(ids: number[]) {
  const file = "data/wikidata/details.json";
  const have = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const missing = ids.filter((id) => !(id in have));
  if (missing.length) {
    mkdirSync("data/wikidata", { recursive: true });
    const got = await detailsByTvmaze(missing);
    for (const id of missing) have[id] = got[id] ?? null;
    writeFileSync(file, JSON.stringify(have));
  }
  return have;
}

/** TVmaze's show index, 250 ids per page, until the first missing page. */
async function index() {
  const shows = [];
  for (let page = 0; ; page++) {
    const batch = await cached(`${CACHE}/index/${page}.json`, `/shows?page=${page}`);
    if (!batch) return shows;
    shows.push(...batch);
    if (page % 50 === 0) console.log(`index page ${page}`);
  }
}

mkdirSync(`${CACHE}/shows`, { recursive: true });
mkdirSync(`${CACHE}/index`, { recursive: true });
mkdirSync("src/data/generated", { recursive: true });

const args = process.argv.slice(2).map(Number);
const ids = args.length ? args : selectSeeds(await index(), await sitelinks());

const wd = await wikidata(ids);
const shows = [];
for (const [i, id] of ids.entries()) {
  const file = `${CACHE}/shows/${id}.json`;
  // Older cache entries were fetched without cast and crew.
  if (existsSync(file) && !JSON.parse(readFileSync(file, "utf8"))._embedded?.cast) rmSync(file);
  const raw = await cached(file, `/shows/${id}?embed[]=episodes&embed[]=cast&embed[]=crew`);
  if (!raw) throw new Error(`TVmaze show ${id} not found`);
  shows.push(toShow(raw, wd[id] ?? undefined));
  if (i % 100 === 99) console.log(`${i + 1} / ${ids.length} shows`);
}
writeFileSync(CATALOGUE, JSON.stringify(uniqueSlugs(shows)));
console.log(`wrote ${CATALOGUE}: ${shows.length} shows`);
