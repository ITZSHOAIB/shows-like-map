// The match lists live in a private Hugging Face dataset, not in git: AI output stays out of the repo.
// pack: validate every list in data/matches/lists against TVmaze and pack them into data/matches/lists.jsonl
//       (one show per line, sorted by id, so each upload is a readable diff).
// push: pack, then upload it with the `hf` CLI.
// pull: download lists.jsonl for the build. Skipped with a warning when HF_TOKEN is unset, so builds still pass, without matches.
// Usage: node scripts/matches/store.ts pack|push|pull   (HF_DATASET overrides the dataset repo)
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { PackedList } from "../../src/lib/matches.ts";
import type { List } from "./generate.ts";
import { validate } from "./resolve.ts";

const REPO = process.env.HF_DATASET ?? "Sohab4tech/shows-like-map";
const DIR = "data/matches/lists";
const FILE = "data/matches/lists.jsonl";

const cmd = process.argv[2];
if (cmd === "pack" || cmd === "push") {
  const ids = readdirSync(DIR).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5))).sort((a, b) => a - b);
  const lines: string[] = [];
  let valid = 0;
  for (const id of ids) {
    const list: List = JSON.parse(readFileSync(`${DIR}/${id}.json`, "utf8"));
    const ok = await validate(id, list.picks);
    const shown = (p: { title: string; year: number | null }) => ok.find((v) => v.title === p.title && v.year === p.year)?.show ?? null;
    const packed: PackedList = { id, model: list.model, ending: list.ending, picks: list.picks.map((p) => ({ ...p, tvmaze: shown(p) })) };
    valid += ok.length;
    lines.push(JSON.stringify(packed));
  }
  writeFileSync(FILE, lines.join("\n") + "\n");
  console.log(`packed ${ids.length} lists, ${valid} valid picks, into ${FILE}`);
  if (cmd === "push") execFileSync("hf", ["upload", REPO, FILE, "lists.jsonl", "--repo-type", "dataset", "--commit-message", `Update ${ids.length} match lists`], { stdio: "inherit" });
} else if (cmd === "pull") {
  const token = process.env.HF_TOKEN;
  if (!token) {
    console.warn("HF_TOKEN is not set: building without match lists");
  } else {
    const res = await fetch(`https://huggingface.co/datasets/${REPO}/resolve/main/lists.jsonl`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Hugging Face: HTTP ${res.status} for ${REPO}/lists.jsonl`);
    mkdirSync("data/matches", { recursive: true });
    writeFileSync(FILE, await res.text());
    console.log(`pulled ${readFileSync(FILE, "utf8").split("\n").filter(Boolean).length} match lists from ${REPO}`);
  }
} else {
  console.error("usage: node scripts/matches/store.ts pack|push|pull");
  process.exit(1);
}
