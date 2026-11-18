// PROTOTYPE (open-data stack): ask a fresh, tool-less Claude session for "shows like X" lists.
// Seeds are TVmaze shows; the model answers from its own knowledge (no TMDB or TVmaze data is sent beyond
// the seed's name, year and platform). Raw answers are cached in data/open/ai/<tvmazeId>.json.
// Usage: node scripts/open/gen-similar.ts <seeds.json> [--model opus] [--batch 5]
//   seeds.json: [{ "id": 17861, "name": "Dark", "year": 2017, "platform": "Netflix", "country": "DE" }, ...]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

type Seed = { id: number; name: string; year: number | null; platform: string | null; country: string | null };
export type Pick = { title: string; year: number | null; why: string };

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const seeds: Seed[] = JSON.parse(readFileSync(args[0], "utf8"));
const MODEL = opt("model", "opus");
const BATCH = Number(opt("batch", "5"));
const OUT = "data/open/ai";
mkdirSync(OUT, { recursive: true });

const PROMPT = `You recommend TV series and web series. For each show below, list the 15 series a fan of it would most enjoy next, best first.

Rules:
- Real, released TV series or web series only (no films). Use the show's best-known English title and its first-air year.
- Judge by what makes the show loved: tone, premise, themes, pacing, audience. Not by surface overlaps like a shared network or actor.
- Keep the audience right: no kids' shows for adult dramas, no cartoons for live-action unless the fit is genuinely strong.
- For Indian shows, favour Indian series a fan would actually reach for, but include international picks when they truly fit.
- "why": one short, specific reason (max 12 words) that names the shared thing, e.g. "Time-loop mystery across generations of one small town".
- Do not list the show itself.

Answer with JSON only, no prose, shaped exactly:
{"<seed id>": [{"title": "...", "year": 2019, "why": "..."}, ...], ...}

Shows:
`;

function ask(batch: Seed[]): Record<string, Pick[]> {
  const lines = batch.map((s) => `- id ${s.id}: ${s.name} (${s.year ?? "?"}${s.platform ? `, ${s.platform}` : ""}${s.country ? `, ${s.country}` : ""})`);
  const out = execFileSync("claude", ["-p", "--model", MODEL, "--tools", "", "--no-session-persistence", "--output-format", "json"], {
    input: PROMPT + lines.join("\n"),
    cwd: tmpdir(), // outside the project, so no project memory or instructions leak into the answer
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  const result: string = JSON.parse(out).result;
  return JSON.parse(result.slice(result.indexOf("{"), result.lastIndexOf("}") + 1));
}

const todo = seeds.filter((s) => !existsSync(`${OUT}/${s.id}.json`));
console.log(`${todo.length} of ${seeds.length} seeds to generate with ${MODEL}`);
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  try {
    const answer = ask(batch);
    for (const s of batch) {
      const picks = answer[String(s.id)];
      if (picks?.length) writeFileSync(`${OUT}/${s.id}.json`, JSON.stringify({ seed: s, model: MODEL, picks }));
      else console.log(`  no answer for ${s.name}`);
    }
    console.log(`  ${Math.min(i + BATCH, todo.length)} done`);
  } catch (e) {
    console.log(`  batch failed (${batch.map((s) => s.name).join(", ")}): ${(e as Error).message.slice(0, 200)}`);
  }
}
