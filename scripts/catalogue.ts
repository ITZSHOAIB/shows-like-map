// Build the show catalogue from TVmaze into src/data/generated/catalogue.json.
// Raw responses are cached in data/tvmaze (git-ignored); delete a file to refetch that show.
// Usage: pnpm data [tvmazeId ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CATALOGUE, toShow, uniqueSlugs } from "../src/lib/catalogue.ts";
import { tvmaze } from "./tvmaze.ts";

const CACHE = "data/tvmaze";
const SEEDS = [47014]; // Panchayat. Tracer only: the seed list replaces this.

async function raw(id: number) {
  const file = `${CACHE}/${id}.json`;
  if (!existsSync(file)) {
    const show = await tvmaze(`/shows/${id}?embed=episodes`);
    if (!show) throw new Error(`TVmaze show ${id} not found`);
    writeFileSync(file, JSON.stringify(show));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

const ids = process.argv.slice(2).map(Number);
mkdirSync(CACHE, { recursive: true });
mkdirSync("src/data/generated", { recursive: true });

const shows = [];
for (const id of ids.length ? ids : SEEDS) shows.push(toShow(await raw(id)));
writeFileSync(CATALOGUE, JSON.stringify(uniqueSlugs(shows)));
console.log(`wrote ${CATALOGUE}: ${shows.length} shows`);
