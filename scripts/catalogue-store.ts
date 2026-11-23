// The catalogue is built by the weekly data job (.github/workflows/data.yml) and kept in the Hugging Face dataset,
// so checks and deploys download it instead of refetching TVmaze, Wikidata and Wikipedia on every push.
// push: print what changed against the dataset's copy, then upload src/data/generated/catalogue.json.
// pull: download it for the build. Unlike the match lists it can't be skipped: there is no site without it.
// Usage: node scripts/catalogue-store.ts push|pull   (both need HF_TOKEN; push needs one that can write)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CATALOGUE, type Show } from "../src/lib/catalogue.ts";
import { changes } from "./catalogue-changes.ts";
import { download, REPO, upload } from "./hf.ts";

const token = process.env.HF_TOKEN;
if (!token) throw new Error("HF_TOKEN is not set: the catalogue lives in the Hugging Face dataset");

const PREVIEW_CATALOGUE = "catalogue-preview-payoff-build.json";
const cmd = process.argv[2];
if (cmd === "push") {
  const after: Show[] = JSON.parse(readFileSync(CATALOGUE, "utf8"));
  const before: Show[] = JSON.parse((await download("catalogue.json", token)) ?? "[]");
  const summary = changes(before, after);
  for (const line of summary) console.log(line);
  upload(CATALOGUE, "catalogue.json", `Update catalogue: ${after.length} shows\n\n${summary.join("\n")}`);
} else if (cmd === "push-preview") {
  const after: Show[] = JSON.parse(readFileSync(CATALOGUE, "utf8"));
  upload(CATALOGUE, PREVIEW_CATALOGUE, `Refresh payoff-build preview catalogue: ${after.length} shows`);
} else if (cmd === "pull") {
  const preview = process.env.CF_PAGES_BRANCH === "payoff-build";
  let path = preview ? PREVIEW_CATALOGUE : "catalogue.json";
  let text = await download(path, token);
  if (text === null && preview) {
    // Let an initial preview deploy succeed before the branch-specific catalogue has been uploaded.
    path = "catalogue.json";
    text = await download(path, token);
  }
  if (text === null) throw new Error(`Hugging Face: ${REPO} has no ${path}: run the data workflow`);
  mkdirSync("src/data/generated", { recursive: true });
  writeFileSync(CATALOGUE, text);
  console.log(`pulled ${JSON.parse(text).length} shows from ${REPO}/${path}`);
} else {
  console.error("usage: node scripts/catalogue-store.ts push|push-preview|pull");
  process.exit(1);
}
