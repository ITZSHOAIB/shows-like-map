import { shows } from "../lib/data";

// [slug, name, original, year, poster], most popular first (search ranks ties by this order).
export function GET() {
  const entries = [...shows]
    .sort((a, b) => b.popularity - a.popularity)
    .map((s) => [s.slug, s.name, s.original ?? "", s.year ?? 0, s.poster ?? ""]);
  return new Response(JSON.stringify(entries), { headers: { "Content-Type": "application/json" } });
}
