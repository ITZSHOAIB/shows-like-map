// Blind judge for match lists. Codex (a different model family from the Claude that wrote the lists) rates every
// candidate from every run, merged and shuffled with no source labels, so no list is graded by its own author.
// Each run is scored on what the site would show: the validated top 10, with empty slots counted as 0.
// Ratings are cached per seed and TVmaze id in data/eval/ratings.json, so only new candidates go to Codex.
// Usage: node scripts/eval/judge.ts <run dir> [<run dir> ...]   (run dirs are generate.ts --out folders)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename } from "node:path";
import { loadCatalogue } from "../../src/lib/catalogue.ts";
import type { List } from "../matches/generate.ts";
import { validate, type Resolved } from "../matches/resolve.ts";

const runs = process.argv.slice(2);
const FILE = "data/eval/ratings.json";
const ratings: Record<number, Record<number, number>> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
const catalogue = new Map(loadCatalogue().map((s) => [s.id, s]));
const listIds = (dir: string) => readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5)));
const seeds = listIds(runs[0]).filter((id) => runs.every((r) => existsSync(`${r}/${id}.json`)) && catalogue.has(id));

// What each run would show per seed, plus how many of its 15 picks checked out on TVmaze.
const lists: Record<string, Record<number, { list: List; shown: Resolved[]; valid: number }>> = {};
for (const r of runs) {
  lists[r] = {};
  for (const id of seeds) {
    const list: List = JSON.parse(readFileSync(`${r}/${id}.json`, "utf8"));
    const valid = await validate(id, list.picks.slice(0, 15));
    lists[r][id] = { list, shown: valid.slice(0, 10).map((v) => v.show), valid: valid.length };
  }
}

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

const RUBRIC = `You are judging TV recommendations. For each SEED show, rate every numbered candidate for one question:
"Would a typical fan of the seed show, looking for what to watch next, be glad this was recommended?"

2 = strong: very likely to enjoy it next (similar appeal: tone, genre, themes, storytelling)
1 = okay: some real overlap, a reasonable but weaker suggestion
0 = poor: different audience or tone, or it only shares a surface trait (same actor, country, network, or it is a remake of the seed)

Judge from your own knowledge. Do not run commands or browse. If you don't recognise a candidate, rate it 0.
Reply with only JSON, no prose, keyed by seed id and candidate number: {"<seed id>": {"c1": 2, "c2": 0, ...}, ...}`;

// Only candidates without a cached rating go to Codex, five seeds per call.
const pending = seeds
  .map((id) => {
    const pool = new Map<number, Resolved>();
    for (const r of runs) for (const s of lists[r][id].shown) if (ratings[id]?.[s.id] === undefined) pool.set(s.id, s);
    return { id, pool: shuffle([...pool.values()], id) };
  })
  .filter((p) => p.pool.length);
mkdirSync("data/eval", { recursive: true });
for (let b = 0; b < pending.length; b += 5) {
  const batch = pending.slice(b, b + 5);
  const body = batch
    .map(({ id, pool }) => {
      const s = catalogue.get(id)!;
      return `SEED ${id}: ${s.name} (${[s.premiered?.slice(0, 4), s.platform].filter(Boolean).join(", ")})\n${pool.map((c, i) => `c${i + 1}. ${c.name}${c.year ? ` (${c.year})` : ""}`).join("\n")}`;
    })
    .join("\n\n");
  const last = `${tmpdir()}/slm-judge-${process.pid}-${b}.txt`;
  console.log(`judging ${b / 5 + 1} / ${Math.ceil(pending.length / 5)}: ${batch.map((p) => catalogue.get(p.id)!.name).join(", ")}`);
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
  for (const { id, pool } of batch) pool.forEach((c, i) => {
    const rating = json[id]?.[`c${i + 1}`];
    if (rating === 0 || rating === 1 || rating === 2) (ratings[id] ??= {})[c.id] = rating;
  });
  writeFileSync(FILE, JSON.stringify(ratings));
}

// Per run: quality of the shown top 10, validity, the AI's ending answers against TVmaze, and cost per show.
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
const rows = runs.map((r) => {
  const per = seeds.map((id) => {
    const got = lists[r][id].shown.map((s) => ratings[id]?.[s.id] ?? 0);
    const top = [...got, ...Array(10).fill(0)].slice(0, 10);
    return { m5: mean(top.slice(0, 5)), m10: mean(top), s5: top.slice(0, 5).filter((x) => x === 2).length / 5, s10: top.filter((x) => x === 2).length / 10 };
  });
  const valid = mean(seeds.map((id) => lists[r][id].valid / 15));
  const clash = seeds.filter((id) => lists[r][id].list.ending === "ongoing" && catalogue.get(id)!.status === "ended").length;
  const calls = existsSync(`${r}/_calls.jsonl`) ? readFileSync(`${r}/_calls.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  const shows = calls.reduce((a, c) => a + c.shows, 0) || 1;
  const sum = (f: (c: any) => number) => calls.reduce((a, c) => a + (f(c) ?? 0), 0) / shows;
  const tokens = sum((c) => c.usage.input_tokens + c.usage.cache_creation_input_tokens + c.usage.cache_read_input_tokens + c.usage.output_tokens);
  return `| ${basename(r)} | ${mean(per.map((p) => p.m5)).toFixed(2)} | ${mean(per.map((p) => p.m10)).toFixed(2)} | ${(100 * mean(per.map((p) => p.s5))).toFixed(0)}% | ${(100 * mean(per.map((p) => p.s10))).toFixed(0)}% | ${(100 * valid).toFixed(0)}% | ${clash} | ${(sum((c) => c.ms) / 1000).toFixed(1)} s | ${Math.round(tokens / 1000)}k | $${sum((c) => c.usd).toFixed(3)} |`;
});
console.log(`${seeds.length} seeds\n`);
console.log("| run | mean @5 (0-2) | mean @10 | strong @5 | strong @10 | valid of 15 | says ongoing, TVmaze ended | time / show | tokens / show | list price / show |");
console.log("|---|---|---|---|---|---|---|---|---|---|\n" + rows.join("\n"));
