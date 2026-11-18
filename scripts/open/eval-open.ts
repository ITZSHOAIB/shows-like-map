// PROTOTYPE eval for the open-data stack: the AI lists (data/open/ai) against the same hand-made
// acceptable lists (scripts/eval-gold.ts), with both sides mapped to TVmaze ids.
// Also reports picks TVmaze can't find, or finds with a different first-air year (possible made-up shows).
// Usage: node scripts/open/eval-open.ts [--show]
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { GOLD } from "../eval-gold.ts";
import { resolve } from "./tvmaze.ts";

const CACHE = "data/open/resolve-cache.json";
const cache: Record<string, { id: number; name: string; year: number | null } | null> =
  existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
async function find(title: string, year?: number | null) {
  const key = `${title}|${year ?? ""}`;
  if (!(key in cache)) {
    const s = await resolve(title, year);
    cache[key] = s ? { id: s.id, name: s.name, year: Number(s.premiered?.slice(0, 4)) || null } : null;
    writeFileSync(CACHE, JSON.stringify(cache));
  }
  return cache[key];
}

const show = process.argv.includes("--show");
const files = readdirSync("data/open/ai").map((f) => JSON.parse(readFileSync(`data/open/ai/${f}`, "utf8")));
let n = 0, p5 = 0, p10 = 0, picks = 0, missing = 0, offYear = 0;
for (const [name, gold] of Object.entries(GOLD)) {
  const seedShow = await find(name);
  const file = files.find((f) => f.seed.id === seedShow?.id);
  if (!file) { console.log(`skip ${name}: no AI list`); continue; }
  const ok = new Set<number>();
  for (const g of gold) { const s = await find(g); if (s && s.id !== seedShow!.id) ok.add(s.id); }
  const ids: number[] = [];
  const marks: string[] = [];
  for (const p of file.picks) {
    const s = await find(p.title, p.year);
    picks++;
    if (!s) { missing++; marks.push(`?${p.title}`); continue; }
    const yearOff = p.year && s.year && Math.abs(p.year - s.year) > 1;
    if (yearOff) offYear++;
    ids.push(s.id);
    marks.push(`${ok.has(s.id) ? "✓" : "·"}${p.title}${yearOff ? ` [TVmaze: ${s.name} ${s.year}]` : ""}`);
  }
  const hit = (k: number) => ids.slice(0, k).filter((id) => ok.has(id)).length;
  n++; p5 += hit(5) / 5; p10 += hit(10) / 10;
  console.log(`${name.padEnd(20)} ai ${hit(5)}/5 ${hit(10)}/10`);
  if (show) console.log(`   ${marks.slice(0, 10).join(" | ")}`);
}
console.log(`\nmean over ${n} shows: P@5 ${(p5 / n).toFixed(2)}  P@10 ${(p10 / n).toFixed(2)}`);
console.log(`picks not found on TVmaze: ${missing}/${picks}; found but first-air year off by >1: ${offYear}`);
