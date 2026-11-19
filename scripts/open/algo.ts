// PROTOTYPE (open-data algorithm, no AI): "shows like X" from Wikidata + TVmaze metadata only, to compare against AI lists.
// Pool: Wikidata TV series with a TVmaze id and >= 3 Wikipedia editions (data/open/wd/*.csv), Scripted/Animation/Documentary.
// Score: IDF-weighted cosine over prefixed features, a small notability prior, and an animation gate.
// Usage: node scripts/open/algo.ts [--show]   writes data/open/algo.json {seedId: [{id, name, year}]}
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const W: Record<string, number> = {
  P170: 3, // creator
  P58: 2, // screenwriter
  P57: 1.5, // director
  P921: 2, // main subject
  P144: 1.5, // based on
  P840: 1, // narrative location
  P136: 1.5, // genre
  P161: 1, // cast
  P272: 1, // production company
  P449: 0.7, // original broadcaster
  P495: 0.6, // country of origin
  P364: 0.8, // original language
  tg: 1.2, // TVmaze genre
  dec: 0.5, // decade
  ...JSON.parse(process.env.ALGO ?? "{}"),
};
const PRIOR = Number(process.env.PRIOR ?? 0.04);

const csv = (f: string) =>
  readFileSync(f, "utf8").trim().split("\n").slice(1).map((l) => l.split(",") as [string, string]);

const links = new Map(csv("data/open/wd/links.csv").map(([t, l]) => [Number(t), Number(l)]));
const index = new Map<number, any>();
const DIR = "../shows-like-map-main/data/tvmaze/index";
for (const f of readdirSync(DIR)) for (const s of JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))) index.set(s.id, s);

const TYPES = new Set(["Scripted", "Animation", "Documentary"]);
const pool = [...links.keys()].filter((id) => {
  const s = index.get(id);
  return s && TYPES.has(s.type) && !s.genres.includes("Children");
});
const inPool = new Set(pool);

const feats = new Map<number, Set<string>>(pool.map((id) => [id, new Set()]));
for (const f of readdirSync("data/open/wd").filter((f) => /^P\d+\.csv$/.test(f))) {
  const p = f.slice(0, -4);
  for (const [t, v] of csv(`data/open/wd/${f}`)) feats.get(Number(t))?.add(`${p}:${v.split("/").pop()}`);
}
for (const id of pool) {
  const s = index.get(id), F = feats.get(id)!;
  for (const g of s.genres) F.add(`tg:${g}`);
  if (s.premiered) F.add(`dec:${s.premiered.slice(0, 3)}`);
}

const df = new Map<string, number>();
for (const F of feats.values()) for (const f of F) df.set(f, (df.get(f) ?? 0) + 1);
const N = pool.length;
const weight = (f: string) => (W[f.split(":")[0]] ?? 1) * Math.log(N / df.get(f)!);
const vec = new Map<number, Map<string, number>>();
const norm = new Map<number, number>();
for (const [id, F] of feats) {
  const v = new Map([...F].filter((f) => df.get(f)! > 1).map((f) => [f, weight(f)]));
  vec.set(id, v);
  norm.set(id, Math.sqrt([...v.values()].reduce((a, x) => a + x * x, 0)) || 1);
}
// Inverted index so each seed only scores shows that share a feature.
const post = new Map<string, number[]>();
for (const [id, v] of vec) for (const f of v.keys()) (post.get(f) ?? post.set(f, []).get(f)!).push(id);

export function similar(seed: number, k = 10) {
  const a = vec.get(seed);
  if (!a) return [];
  const dot = new Map<number, number>();
  for (const [f, w] of a) for (const id of post.get(f)!) if (id !== seed) dot.set(id, (dot.get(id) ?? 0) + w * vec.get(id)!.get(f)!);
  const anim = (id: number) => index.get(id).type === "Animation";
  return [...dot]
    .map(([id, d]) => {
      let score = d / (norm.get(seed)! * norm.get(id)!) + PRIOR * Math.log(links.get(id)!);
      if (anim(id) !== anim(seed)) score *= 0.4;
      return { id, score };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map(({ id }) => ({ id, name: index.get(id).name, year: Number(index.get(id).premiered?.slice(0, 4)) || null }));
}

const seeds: any[] = JSON.parse(readFileSync("data/open/seeds-eval.json", "utf8"));
const out: Record<number, any[]> = {};
for (const s of seeds) {
  if (!inPool.has(s.id)) console.warn(`${s.name} is not in the pool`);
  out[s.id] = similar(s.id);
}
writeFileSync(process.env.ALGO_OUT ?? "data/open/algo.json", JSON.stringify(out, null, 1));
if (process.argv.includes("--show")) for (const s of seeds) console.log(`${s.name}: ${out[s.id].map((x) => x.name).join(" | ")}`);
console.log(`pool ${N} shows`);
