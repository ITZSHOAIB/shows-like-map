// TVmaze API client. Data is CC BY-SA 4.0: credit and link back to TVmaze, derived data stays CC BY-SA.
// The rate limit is at least 20 calls per 10 s per IP, so calls are spaced and failures retried with backoff.
const API = "https://api.tvmaze.com";
let last = 0;

export async function tvmaze(path: string, tries = 5): Promise<any> {
  for (let t = 0; t < tries; t++) {
    const wait = last + 550 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const res = await fetch(API + path, { headers: { "User-Agent": "ShowsLikeMap/0.1 (+https://showslikemap.sohab.dev)" } });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await new Promise((r) => setTimeout(r, 2000 * 2 ** t));
  }
  throw new Error(`TVmaze ${path}: gave up after ${tries} tries`);
}
