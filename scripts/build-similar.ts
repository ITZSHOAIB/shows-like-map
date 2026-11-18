// Turns cached TMDB shows into src/data/generated/shows.json:
// compact show records + top-60 similar shows with "why it matched" reasons.
// Similarity is plain counting (no ML): cosine over weighted binary features,
// where each feature is weighted by its type and by how rare it is (IDF).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const CACHE = "data/cache/tv";
const OUT = "src/data/generated/shows.json";
const TOP_K = 60;

// Knobs (tuned with scripts/eval-similar.ts on 2026-11-19: P@5 0.27 → 0.41), overridable for tuning runs: SIM='{"recW":0.2}' node scripts/build-similar.ts
const K = {
  k: 3, c: 3, g: 2, n: 0.75, p: 1, // feature type weights
  era: 0.08, // max bonus for the same first-air year, decays over ~8 years
  lang: 0.04,
  animGate: 0.4, // score multiplier when one show is animated and the other isn't
  kidsGate: 0.5, // ... when one is for kids and the other isn't
  recW: 0.15, // bonus for being in TMDB's "people also watched" list, by rank
  qualW: 0.15, // bonus for well-known, well-rated shows
  coW: 0, // bonus for overlapping "people also watched" lists (cosine of the two lists)
  ...JSON.parse(process.env.SIM ?? "{}"),
};
const TYPE_WEIGHT = { k: K.k, c: K.c, g: K.g, n: K.n, p: K.p };
type FeatureType = keyof typeof TYPE_WEIGHT;
const OUT_FILE = process.env.SIM_OUT ?? OUT;

const JUNK_TYPES = new Set(["Talk Show", "News", "Reality"]);
const JUNK_GENRES = new Set(["Talk", "News", "Reality", "Soap"]);

const raw = readdirSync(CACHE).map((f) => JSON.parse(readFileSync(`${CACHE}/${f}`, "utf8")));
const shows = raw.filter(
  (s) => s.name && !JUNK_TYPES.has(s.type) && !s.genres?.some((g: { name: string }) => JUNK_GENRES.has(g.name)),
);
console.log(`${raw.length} cached, ${shows.length} after dropping talk/news/reality/soap`);

// ---- features ----
const labels = new Map<string, string>();
function features(s: any): string[] {
  const out: string[] = [];
  const add = (type: FeatureType, id: number, label: string) => {
    const key = `${type}${id}`;
    labels.set(key, label);
    out.push(key);
  };
  for (const k of s.keywords?.results ?? []) add("k", k.id, k.name);
  for (const c of s.created_by ?? []) add("c", c.id, c.name);
  for (const g of s.genres ?? []) add("g", g.id, g.name);
  for (const n of s.networks ?? []) add("n", n.id, n.name);
  const cast = [...(s.aggregate_credits?.cast ?? [])]
    .sort((a, b) => (b.total_episode_count ?? 0) - (a.total_episode_count ?? 0))
    .slice(0, 6);
  for (const p of cast) add("p", p.id, p.name);
  return [...new Set(out)];
}

const feats = shows.map(features);
const df = new Map<string, number>();
for (const fs of feats) for (const f of fs) df.set(f, (df.get(f) ?? 0) + 1);
const N = shows.length;
const weight = (f: string) => TYPE_WEIGHT[f[0] as FeatureType] * Math.log(1 + N / df.get(f)!);
const norms = feats.map((fs) => Math.sqrt(fs.reduce((a, f) => a + weight(f) ** 2, 0)) || 1);

const postings = new Map<string, number[]>();
feats.forEach((fs, i) => {
  for (const f of fs) if (df.get(f)! > 1) (postings.get(f) ?? postings.set(f, []).get(f)!).push(i);
});

// ---- show records ----
const year = (s: any) => Number((s.first_air_date ?? "").slice(0, 4)) || null;
function runtime(s: any): number | null {
  const rts = (s.episode_run_time ?? []).filter(Boolean).sort((a: number, b: number) => a - b);
  return rts.length ? rts[Math.floor(rts.length / 2)] : (s.last_episode_to_air?.runtime ?? null);
}
function status(s: any) {
  if (s.status === "Ended") return "ended";
  if (s.status === "Canceled") return "cancelled";
  return "ongoing";
}
const slugify = (t: string) =>
  t.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const slugCount = new Map<string, number>();
const baseSlugs = shows.map((s) => {
  const base = [slugify(s.name), year(s)].filter(Boolean).join("-") || String(s.id);
  slugCount.set(base, (slugCount.get(base) ?? 0) + 1);
  return base;
});

const records = shows.map((s, i) => {
  const rt = runtime(s);
  const providers = s["watch/providers"]?.results?.IN?.flatrate ?? [];
  return {
    id: s.id as number,
    slug: slugCount.get(baseSlugs[i])! > 1 ? `${baseSlugs[i]}-${s.id}` : baseSlugs[i],
    name: s.name as string,
    original: s.original_name !== s.name ? (s.original_name as string) : null,
    year: year(s),
    status: status(s),
    seasons: s.number_of_seasons ?? null,
    episodes: s.number_of_episodes ?? null,
    hours: s.number_of_episodes && rt ? Math.max(1, Math.round((s.number_of_episodes * rt) / 60)) : null,
    poster: s.poster_path ?? null,
    backdrop: s.backdrop_path ?? null,
    overview: s.overview ?? "",
    lang: s.original_language as string,
    genres: (s.genres ?? []).map((g: { name: string }) => g.name),
    providers: providers
      .sort((a: any, b: any) => a.display_priority - b.display_priority)
      .slice(0, 4)
      .map((p: any) => ({ name: p.provider_name, logo: p.logo_path })),
    popularity: s.popularity ?? 0,
    rating: s.vote_count ? { avg: Math.round(s.vote_average * 10) / 10, votes: s.vote_count as number } : null,
    similar: [] as { id: number; score: number; reasons: string[]; shared: string[] }[],
  };
});

// ---- audience, "watched together" and quality signals ----
const hasGenre = (s: any, id: number) => (s.genres ?? []).some((g: { id: number }) => g.id === id);
const anim = shows.map((s) => hasGenre(s, 16));
const kids = shows.map((s) => hasGenre(s, 10762));
const recs: number[][] = shows.map((s) =>
  existsSync(`data/cache/recs/${s.id}.json`) ? JSON.parse(readFileSync(`data/cache/recs/${s.id}.json`, "utf8")) : [],
);
const recSets = recs.map((r) => new Set(r));
const coRec = (a: number, b: number) => {
  if (!recs[a].length || !recs[b].length) return 0;
  let n = 0;
  for (const id of recs[a]) if (recSets[b].has(id)) n++;
  return n / Math.sqrt(recs[a].length * recs[b].length);
};
// 0..1: a Bayesian-shrunk score (few votes pull towards 6.5) times how widely it's been seen.
const qual = shows.map((s) => {
  const v = s.vote_count ?? 0;
  const bayes = (v * (s.vote_average ?? 0) + 50 * 6.5) / (v + 50);
  return Math.max(0, (bayes - 5.5) / 3) * Math.min(1, Math.log10(1 + v) / 4);
});

// ---- similarity ----
for (let a = 0; a < N; a++) {
  const dot = new Map<number, number>();
  for (const f of feats[a]) {
    const list = postings.get(f);
    if (!list) continue;
    const w2 = weight(f) ** 2;
    for (const b of list) if (b !== a) dot.set(b, (dot.get(b) ?? 0) + w2);
  }
  const recRank = new Map(recs[a].map((id, r) => [id, r]));
  const scored = [...dot].map(([b, d]) => {
    const ya = records[a].year, yb = records[b].year;
    const era = ya && yb ? K.era * Math.exp(-Math.abs(ya - yb) / 8) : 0;
    const lang = records[a].lang === records[b].lang ? K.lang : 0;
    const r = recRank.get(records[b].id);
    const rec = r === undefined ? 0 : K.recW * (1 - r / 40);
    const gate = (anim[a] !== anim[b] ? K.animGate : 1) * (kids[a] !== kids[b] ? K.kidsGate : 1);
    return { b, score: (d / (norms[a] * norms[b]) + era + lang + rec + K.qualW * qual[b] + (K.coW ? K.coW * coRec(a, b) : 0)) * gate };
  });
  scored.sort((x, y) => y.score - x.score);
  const fa = new Set(feats[a]);
  records[a].similar = scored.slice(0, TOP_K).map(({ b, score }) => {
    const shared = feats[b].filter((f) => fa.has(f)).sort((x, y) => weight(y) - weight(x));
    const specific = shared.filter((f) => f[0] !== "g");
    const reasons = (specific.length >= 2 ? specific : shared).slice(0, 3);
    return { id: records[b].id, score: Math.round(score * 1000) / 1000, reasons, shared: shared.slice(0, 10) };
  });
}

const used = new Set(records.flatMap((r) => r.similar.flatMap((s) => s.shared)));
const featureLabels = Object.fromEntries([...used].map((k) => [k, labels.get(k)!]));

mkdirSync("src/data/generated", { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify({ builtAt: new Date().toISOString(), features: featureLabels, shows: records }));
console.log(`wrote ${OUT_FILE}: ${records.length} shows`);
