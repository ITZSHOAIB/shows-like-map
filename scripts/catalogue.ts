// Build the show catalogue from TVmaze into src/data/generated/catalogue.json.
// Raw responses are cached in data/tvmaze (git-ignored); delete the folder to refetch everything.
// Usage: pnpm data            seeds from TVmaze's full show index (about 400 pages) ranked by Wikidata sitelinks, then one call per show
//        pnpm data 47014 ...  only these TVmaze ids
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CATALOGUE, toShow, uniqueSlugs } from "../src/lib/catalogue.ts";
import { selectSeeds } from "./seeds.ts";
import { tvmaze } from "./tvmaze.ts";
import { sitelinksByTvmaze } from "./wikidata.ts";

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

const shows = [];
for (const [i, id] of ids.entries()) {
  const raw = await cached(`${CACHE}/shows/${id}.json`, `/shows/${id}?embed=episodes`);
  if (!raw) throw new Error(`TVmaze show ${id} not found`);
  shows.push(toShow(raw));
  if (i % 100 === 99) console.log(`${i + 1} / ${ids.length} shows`);
}
writeFileSync(CATALOGUE, JSON.stringify(uniqueSlugs(shows)));
console.log(`wrote ${CATALOGUE}: ${shows.length} shows`);
