// English Wikipedia article text (CC BY-SA 4.0), used only to confirm facts, never shown.
// Articles are cached in data/wikipedia/text.json, keyed by article URL.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const FILE = "data/wikipedia/text.json";
const cache: Record<string, string | null> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};

const save = () => {
  mkdirSync("data/wikipedia", { recursive: true });
  writeFileSync(FILE, JSON.stringify(cache));
};

/** Plain text of each article, two requests at a time, saved as it goes so an interrupted run resumes. */
export async function articleTexts(urls: string[]): Promise<Record<string, string | null>> {
  const todo = urls.filter((u) => !(u in cache));
  for (let i = 0; i < todo.length; i += 2) {
    await Promise.all(todo.slice(i, i + 2).map(async (url) => (cache[url] = await fetchText(url))));
    if (i % 50 === 48) {
      save();
      console.log(`${i + 2} / ${todo.length} Wikipedia articles`);
    }
  }
  if (todo.length) save();
  return Object.fromEntries(urls.map((u) => [u, cache[u]]));
}

/** Wikipedia answers 429 when called too fast: wait as long as it asks (or longer each time), then retry. */
async function fetchText(url: string, tries = 6): Promise<string | null> {
  const title = decodeURIComponent(url.split("/wiki/")[1]);
  const api = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
  for (let t = 0; t < tries; t++) {
    const res = await fetch(api, { headers: { "User-Agent": "ShowsLikeMap/0.1 (+https://showslikemap.sohab.dev)" } });
    if (res.ok) {
      const page: any = Object.values(((await res.json()) as any).query?.pages ?? {})[0];
      return page?.extract ?? null;
    }
    if (res.status !== 429 && res.status < 500) throw new Error(`Wikipedia ${res.status} for ${title}`);
    const wait = Number(res.headers.get("retry-after")) * 1000 || 2000 * 2 ** t;
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`Wikipedia: gave up on ${title} after ${tries} tries`);
}

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether the article says the series itself was cancelled ("Fox canceled The Following", "the series was cancelled"),
 *  not something else in it (a spin-off, viewers' subscriptions, the remainder of a season). */
export function saysCancelled(name: string, text: string): boolean {
  const series = `the (series|show)|${escape(name.replace(/^Marvel['’]s /, ""))}`;
  const re = new RegExp(`\\b(${series})\\b[^.]{0,40}\\bcancel|\\bcancel(l?ed|s)\\s+(${series})\\b`, "i");
  return text.split(/(?<=[.!?])\s+/).some((s) => re.test(s) && !/\b(subscriptions?|remainder)\b/i.test(s));
}
