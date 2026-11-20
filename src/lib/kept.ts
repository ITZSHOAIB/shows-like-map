// "Kept" (#4): the shows you mean to watch, kept in this browser so the list is still there next visit. Nothing leaves it
// unless you share the list, which puts the shows' slugs in a link. Browser-safe: the show page, the header and /kept/ use it.

export const KEPT_KEY = "slm:kept";
/** Enough for any real shortlist, and it keeps a shared link a sane length. */
export const KEPT_MAX = 100;

/** The kept slugs, newest first. Empty when storage is blocked or holds something else. */
export function readKept(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEPT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function writeKept(list: string[]) {
  try {
    localStorage.setItem(KEPT_KEY, JSON.stringify(list.slice(0, KEPT_MAX)));
  } catch {}
}

/** Kept goes first; kept again comes off. */
export const toggled = (list: string[], slug: string) => (list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list].slice(0, KEPT_MAX));

/** Theirs first, in their order, then yours: "Keep all" on a list someone shared. */
export const merged = (mine: string[], theirs: string[]) => [...new Set([...theirs, ...mine])].slice(0, KEPT_MAX);

/** /kept/?s=breaking-bad,dark: slugs as they are, unescaped by URLSearchParams. Pages that don't exist are dropped later. */
export const shareUrl = (origin: string, list: string[]) => `${origin}/kept/?s=${list.map(encodeURIComponent).join(",")}`;

export function fromShare(search: string): string[] | null {
  const s = new URLSearchParams(search).get("s");
  if (s === null) return null;
  const slugs = s.split(",").map((x) => x.trim()).filter((x) => x && x.length <= 100);
  return [...new Set(slugs)].slice(0, KEPT_MAX);
}
