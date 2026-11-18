// TVmaze API (CC BY-SA 4.0: credit and link back to TVmaze; derived data stays CC BY-SA).
// Rate limit is at least 20 calls / 10 s per IP, so calls are spaced and 429s retried.
const API = "https://api.tvmaze.com";
let last = 0;

export async function tvmaze(path: string, tries = 5): Promise<any> {
  for (let t = 0; t < tries; t++) {
    const wait = last + 550 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const res = await fetch(API + path, { headers: { "User-Agent": "ShowsLikeMap/0.1 (prototype)" } });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await new Promise((r) => setTimeout(r, 2000 * 2 ** t));
  }
  return null;
}

/** Find a show by title (and first-air year when known). TVmaze's best text match is often a remake or
 *  spin-off, so among the close matches prefer the right year, then the exact title, then the most-followed show. */
export async function resolve(title: string, year?: number | null): Promise<any> {
  const hits: { score: number; show: any }[] = (await tvmaze(`/search/shows?q=${encodeURIComponent(title)}`)) ?? [];
  if (!hits.length) return null;
  const close = hits.filter((h) => h.score >= hits[0].score * 0.7);
  const yearOf = (s: any) => Number(s.premiered?.slice(0, 4)) || 0;
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const rank = (h: { show: any }) =>
    (year && Math.abs(yearOf(h.show) - year) <= 1 ? 1000 : 0) + (norm(h.show.name) === norm(title) ? 500 : 0) + (h.show.weight ?? 0);
  return close.sort((a, b) => rank(b) - rank(a))[0].show;
}
