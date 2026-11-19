// Generate "shows like X" lists with a fresh, tool-less Claude session per batch (decision 0003).
// The model gets only each show's name, year, platform and language, and answers from its own knowledge.
// Lists are cached per show in <out>/<tvmazeId>.json; per-call time and usage go to <out>/_calls.jsonl.
// Usage: node scripts/matches/generate.ts [--model opus] [--batch 10] [--out data/matches/lists] [--sample 50] [ids...]
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { loadCatalogue } from "../../src/lib/catalogue.ts";
import { evalShows, type EvalShow } from "../eval/shows.ts";
import type { Pick } from "./resolve.ts";

export type Ending = "planned" | "cancelled" | "ongoing" | "unsure";
export type List = { id: number; model: string; batch: number; ending: Ending; picks: Pick[] };

const PROMPT = `You recommend TV series and web series. For each show below, list the 15 series a fan of it would most enjoy next, best first.

Rules:
- Real, released TV series or web series only (no films). Use the show's best-known English title and its first-air year.
- Judge by what makes the show loved: tone, premise, themes, pacing, audience. Not by surface overlaps like a shared network or actor.
- Keep the audience right: no kids' shows for adult dramas, no cartoons for live-action unless the fit is genuinely strong.
- For Indian shows, favour Indian series a fan would actually reach for, but include international picks when they truly fit.
- "why": one short, specific reason (max 12 words) that names the shared thing, e.g. "Time-loop mystery across generations of one small town".
- Do not list the show itself.

Also say how each show itself ended: "planned" (concluded as its makers intended), "cancelled" (cut off by the network or platform),
"ongoing" (still being made), or "unsure".

Answer with JSON only, no prose, shaped exactly:
{"<show id>": {"ending": "planned", "picks": [{"title": "...", "year": 2019, "why": "..."}, ...]}, ...}

Shows:
`;

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const MODEL = opt("model", "opus");
const BATCH = Number(opt("batch", "10"));
const OUT = opt("out", "data/matches/lists");
const SAMPLE = Number(opt("sample", "0"));
const ids = args.filter((a, i) => /^\d+$/.test(a) && !args[i - 1]?.startsWith("--")).map(Number);

const describe = (s: EvalShow) => `- id ${s.id}: ${s.name} (${[s.premiered?.slice(0, 4), s.platform, s.language].filter(Boolean).join(", ")})`;

/** The first JSON object in a reply, ignoring any prose before or after it (which may itself contain braces). */
function firstObject(text: string) {
  const start = text.indexOf("{");
  let depth = 0, inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("no complete JSON object in the reply");
}

/** One Claude call for a batch of shows. Runs outside the repo so no project memory or instructions leak in. */
function ask(batch: EvalShow[]) {
  const win = process.platform === "win32"; // on Windows the call goes through a shell, which needs the empty tool list quoted
  const out = execFileSync("claude", ["-p", "--model", MODEL, "--tools", win ? '""' : "", "--no-session-persistence", "--output-format", "json"], {
    input: PROMPT + batch.map(describe).join("\n"),
    cwd: tmpdir(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: win,
    timeout: 15 * 60_000,
  });
  const res = JSON.parse(out);
  const lists = firstObject(res.result);
  // total_cost_usd is the API list price; under a subscription it is notional, but it still compares configs fairly.
  return { lists, stats: { ms: res.duration_ms, usd: res.total_cost_usd, usage: res.usage } };
}

// A sample takes every nth show, so it spans the popularity range of the catalogue.
// Explicit ids may be shows outside the catalogue (TVmaze is asked for them), so an eval can cover shows without a page.
let shows: EvalShow[] = ids.length ? await evalShows(ids) : loadCatalogue();
if (SAMPLE) shows = shows.filter((_, i) => i % Math.floor(shows.length / SAMPLE) === 0).slice(0, SAMPLE);
const todo = shows.filter((s) => !existsSync(`${OUT}/${s.id}.json`));
mkdirSync(OUT, { recursive: true });
console.log(`${todo.length} of ${shows.length} shows to generate, ${MODEL}, ${BATCH} per call, into ${OUT}`);

let failures = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  try {
    const { lists, stats } = ask(batch);
    for (const s of batch) {
      const l = lists[s.id];
      if (!l?.picks?.length) continue;
      const list: List = { id: s.id, model: MODEL, batch: BATCH, ending: l.ending ?? "unsure", picks: l.picks };
      writeFileSync(`${OUT}/${s.id}.json`, JSON.stringify(list, null, 1));
    }
    appendFileSync(`${OUT}/_calls.jsonl`, JSON.stringify({ model: MODEL, shows: batch.length, ids: batch.map((s) => s.id), ...stats }) + "\n");
    console.log(`${Math.min(i + BATCH, todo.length)} / ${todo.length}  ${Math.round(stats.ms / 1000)} s`);
    failures = 0;
  } catch (e) {
    // execFileSync puts Claude's structured API error in stdout, not in Error.message.
    const error = e as Error & { stdout?: string | Buffer };
    let detail = error.message;
    let quota = false;
    try {
      const response = JSON.parse(String(error.stdout));
      detail = response.result ?? detail;
      quota = response.api_error === "usage_limit_reached";
    } catch { /* Non-JSON failures still report the command error. */ }
    console.error(`batch ${batch.map((s) => s.name).join(", ")} failed: ${detail.slice(0, 500)}`);
    if (quota || ++failures >= 3) {
      console.error("Generation stopped. Saved lists are intact; rerun the same command to resume missing shows.");
      process.exitCode = 1;
      break;
    }
  }
}
