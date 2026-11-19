// The shows an eval run is about. Catalogue shows come from the catalogue; any other TVmaze id is fetched once
// and cached in data/eval/shows.json, so an eval can cover shows (say, lesser-known Indian series) that have no page yet.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadCatalogue, toShow, type Show } from "../../src/lib/catalogue.ts";
import { tvmaze } from "../tvmaze.ts";

export type EvalShow = Pick<Show, "id" | "name" | "premiered" | "platform" | "language" | "status">;

const FILE = "data/eval/shows.json";
const fetched: Record<number, EvalShow> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};

export async function evalShows(ids: number[]): Promise<EvalShow[]> {
  const catalogue = new Map(loadCatalogue().map((s) => [s.id, s]));
  const out: EvalShow[] = [];
  for (const id of ids) {
    if (!catalogue.has(id) && !fetched[id]) {
      const raw = await tvmaze(`/shows/${id}`);
      if (!raw) throw new Error(`TVmaze has no show ${id}`);
      fetched[id] = toShow(raw);
      mkdirSync("data/eval", { recursive: true });
      writeFileSync(FILE, JSON.stringify(fetched));
    }
    out.push(catalogue.get(id) ?? fetched[id]);
  }
  return out;
}
