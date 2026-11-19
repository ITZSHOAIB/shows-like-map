// Match lists: "shows like X", generated offline by Claude and validated against TVmaze (decision 0003).
// scripts/matches/store.ts pulls them into data/matches/lists.jsonl; pages read them at build time.
import { existsSync, readFileSync } from "node:fs";

/** One packed line of lists.jsonl. A pick's tvmaze is null when it didn't check out on TVmaze. */
export interface PackedList {
  id: number;
  model: string;
  ending: string;
  picks: { title: string; year: number | null; why: string; tvmaze: { id: number; name: string; year: number | null } | null }[];
}

export interface Match {
  id: number; // TVmaze id
  name: string;
  year: number | null;
  why: string;
}

const LISTS = "data/matches/lists.jsonl";

/** The validated picks the site shows, best first: the top 10 (decision in #2). Those without a page show unlinked. */
export function topMatches(list: PackedList, count = 10): Match[] {
  return list.picks
    .filter((p) => p.tvmaze)
    .slice(0, count)
    .map((p) => ({ id: p.tvmaze!.id, name: p.tvmaze!.name, year: p.tvmaze!.year, why: p.why }));
}

/** Every packed list. Empty when the lists haven't been pulled, so the site still builds without them. */
export function loadLists(): PackedList[] {
  if (!existsSync(LISTS)) return [];
  return readFileSync(LISTS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

export function loadMatches(): Map<number, Match[]> {
  return new Map(loadLists().map((list) => [list.id, topMatches(list)]));
}
