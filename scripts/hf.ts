// The private Hugging Face dataset that holds the generated data (match lists, catalogue); none of it is in git.
// HF_DATASET overrides the dataset repo. Reads need HF_TOKEN; uploads go through the `hf` CLI, which reads it too.
import { execFileSync } from "node:child_process";

export const REPO = process.env.HF_DATASET ?? "Sohab4tech/shows-like-map";

/** A file from the dataset as text, or null when it doesn't exist there yet. */
export async function download(path: string, token: string): Promise<string | null> {
  const res = await fetch(`https://huggingface.co/datasets/${REPO}/resolve/main/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Hugging Face: HTTP ${res.status} for ${REPO}/${path}`);
  return res.text();
}

export function upload(file: string, path: string, message: string) {
  execFileSync("hf", ["upload", REPO, file, path, "--repo-type", "dataset", "--commit-message", message], { stdio: "inherit" });
}
