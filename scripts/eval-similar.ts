// PROTOTYPE eval: how many of each engine's top 5 / top 10 are in the hand-made acceptable list (scripts/eval-gold.ts).
// Engines: ours (src/data/generated/shows.json) and TMDB's own recommendations (data/cache/recs),
// both limited to shows in our sample so neither is marked down for shows the other can't pick.
// Usage: node scripts/eval-similar.ts [--show]   (--show prints each engine's top 5)
import { existsSync, readFileSync } from "node:fs";
import { GOLD } from "./eval-gold.ts";

const { shows } = JSON.parse(readFileSync(process.env.SIM_OUT ?? "src/data/generated/shows.json", "utf8")) as {
  shows: { id: number; name: string; similar: { id: number }[] }[];
};
const byId = new Map(shows.map((s) => [s.id, s]));
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const byName = new Map<string, (typeof shows)[number]>();
// Several shows can share a name (remakes): the eval means the most-matched one, so keep the first by popularity order.
for (const s of shows) if (!byName.has(norm(s.name))) byName.set(norm(s.name), s);

const recs = (id: number): number[] =>
  existsSync(`data/cache/recs/${id}.json`) ? JSON.parse(readFileSync(`data/cache/recs/${id}.json`, "utf8")).filter((r: number) => byId.has(r) && r !== id) : [];

const engines: Record<string, (id: number) => number[]> = {
  ours: (id) => byId.get(id)!.similar.map((m) => m.id),
  tmdb: recs,
};

const show = process.argv.includes("--show");
const totals: Record<string, { p5: number; p10: number }> = {};
let n = 0;
for (const [name, gold] of Object.entries(GOLD)) {
  const s = byName.get(norm(name));
  if (!s) { console.log(`skip ${name}: not in sample`); continue; }
  const ok = new Set(gold.map((g) => byName.get(norm(g))?.id).filter((id) => id && id !== s.id));
  n++;
  const line: string[] = [];
  for (const [engine, top] of Object.entries(engines)) {
    const ids = top(s.id);
    const hit = (k: number) => ids.slice(0, k).filter((id) => ok.has(id)).length;
    totals[engine] ??= { p5: 0, p10: 0 };
    totals[engine].p5 += hit(5) / 5;
    totals[engine].p10 += hit(10) / 10;
    line.push(`${engine} ${hit(5)}/5 ${hit(10)}/10`);
    if (show) console.log(`  ${engine.padEnd(5)} ${ids.slice(0, 5).map((id) => (ok.has(id) ? "✓" : "·") + byId.get(id)!.name).join(" | ")}`);
  }
  console.log(`${name.padEnd(20)} (${ok.size} ok in sample)  ${line.join("   ")}`);
}
console.log("\nmean precision over", n, "shows");
for (const [e, t] of Object.entries(totals)) console.log(`  ${e.padEnd(5)} P@5 ${(t.p5 / n).toFixed(2)}  P@10 ${(t.p10 / n).toFixed(2)}`);
