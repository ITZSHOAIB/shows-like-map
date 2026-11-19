// PROTOTYPE blind judge: Codex (a different model family from the Claude that wrote the AI lists) rates every
// candidate from every engine, merged and shuffled with no source labels, so no engine is graded by its own author.
// Engines: ai (data/open/ai, top 10), algo-plain and algo-tuned (data/open/algo-*.json, from algo.ts).
// Usage: node scripts/open/judge.ts   (cached per batch in data/open/judge/; delete to rerun)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const seeds: any[] = JSON.parse(readFileSync("data/open/seeds-eval.json", "utf8"));
const resolved: Record<string, any> = JSON.parse(readFileSync("data/open/resolve-cache.json", "utf8"));
const norm = (t: string) => t.replace(/\s*\(\d{4}\)\s*$/, "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

type Cand = { name: string; year: number | null };
const engines: Record<string, (s: any) => Cand[]> = {
  ai: (s) =>
    JSON.parse(readFileSync(`data/open/ai/${s.id}.json`, "utf8"))
      .picks.slice(0, 10)
      .map((p: any) => {
        const r = resolved[`${p.title}|${p.year ?? ""}`];
        return r ? { name: r.name, year: r.year } : { name: p.title, year: p.year };
      }),
  "algo-plain": (s) => JSON.parse(readFileSync("data/open/algo-plain.json", "utf8"))[s.id],
  "algo-tuned": (s) => JSON.parse(readFileSync("data/open/algo-tuned.json", "utf8"))[s.id],
};

// Deterministic shuffle so reruns build the same prompt.
function shuffle<T>(a: T[], seed: number) {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const lists = new Map(seeds.map((s) => [s.id, Object.fromEntries(Object.entries(engines).map(([e, f]) => [e, f(s)]))]));
const pool = new Map(
  seeds.map((s) => {
    const all = new Map<string, Cand>();
    for (const l of Object.values(lists.get(s.id)!)) for (const c of l) all.set(norm(c.name), c);
    return [s.id, shuffle([...all.values()], s.id)];
  }),
);

const RUBRIC = `You are judging TV recommendations. For each SEED show, rate every candidate for one question:
"Would a typical fan of the seed show, looking for what to watch next, be glad this was recommended?"

2 = strong: very likely to enjoy it next (similar appeal: tone, genre, themes, storytelling)
1 = okay: some real overlap, a reasonable but weaker suggestion
0 = poor: different audience or tone, or it only shares a surface trait (same actor, country, network, or it is a remake of the seed)

Judge from your own knowledge. Do not run commands or browse. If you don't recognise a candidate, rate it 0 and set "unknown": true.
Reply with only JSON, no prose: {"<seed id>": [{"name": "<candidate name exactly as given>", "rating": 0|1|2, "unknown": false}, ...], ...}`;

mkdirSync("data/open/judge", { recursive: true });
const ratings: Record<number, Map<string, { rating: number; unknown: boolean }>> = {};
for (let b = 0; b < seeds.length; b += 5) {
  const batch = seeds.slice(b, b + 5);
  const file = `data/open/judge/batch-${b / 5}.json`;
  if (!existsSync(file)) {
    const body = batch
      .map((s) => `SEED ${s.id}: ${s.name} (${s.year}${s.platform ? `, ${s.platform}` : ""})\n${pool.get(s.id)!.map((c) => `- ${c.name}${c.year ? ` (${c.year})` : ""}`).join("\n")}`)
      .join("\n\n");
    const last = `${tmpdir()}/slm-judge-${b}.txt`;
    console.log(`judging batch ${b / 5 + 1}: ${batch.map((s) => s.name).join(", ")}`);
    const r = spawnSync("codex", ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-o", last, "-"], {
      input: `${RUBRIC}\n\n${body}`,
      cwd: tmpdir(),
      encoding: "utf8",
      shell: true,
      timeout: 15 * 60_000,
    });
    if (!existsSync(last)) throw new Error(`codex failed: ${r.stderr?.slice(-2000)}`);
    const text = readFileSync(last, "utf8");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    writeFileSync(file, JSON.stringify(json, null, 1));
  }
  const json = JSON.parse(readFileSync(file, "utf8"));
  for (const s of batch) ratings[s.id] = new Map((json[s.id] ?? []).map((c: any) => [norm(c.name), { rating: c.rating, unknown: !!c.unknown }]));
}

// Metrics per engine: mean rating (0-2) of the top 5 and top 10, and the share rated "strong".
const rows: string[] = [];
const per: Record<string, string[]> = {};
for (const e of Object.keys(engines)) {
  let m5 = 0, m10 = 0, s5 = 0, s10 = 0, unk = 0, missing = 0;
  for (const s of seeds) {
    const got = lists.get(s.id)![e].map((c: Cand) => ratings[s.id].get(norm(c.name)));
    missing += got.filter((g: any) => !g).length;
    const r = got.map((g: any) => g?.rating ?? 0);
    unk += got.filter((g: any) => g?.unknown).length;
    m5 += r.slice(0, 5).reduce((a: number, x: number) => a + x, 0) / 5;
    m10 += r.reduce((a: number, x: number) => a + x, 0) / 10;
    s5 += r.slice(0, 5).filter((x: number) => x === 2).length / 5;
    s10 += r.filter((x: number) => x === 2).length / 10;
    (per[s.name] ??= []).push(`${e} ${(r.slice(0, 5).reduce((a: number, x: number) => a + x, 0) / 5).toFixed(1)}`);
  }
  const n = seeds.length;
  rows.push(`| ${e} | ${(m5 / n).toFixed(2)} | ${(m10 / n).toFixed(2)} | ${((100 * s5) / n).toFixed(0)}% | ${((100 * s10) / n).toFixed(0)}% | ${unk} | ${missing} |`);
}
console.log("| engine | mean rating @5 (0-2) | @10 | strong @5 | strong @10 | unknown | unrated |\n|---|---|---|---|---|---|---|\n" + rows.join("\n"));
console.log("\nper show, mean @5:");
for (const [name, v] of Object.entries(per)) console.log(`${name.padEnd(18)} ${v.join("  ")}`);
