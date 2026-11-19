// What changed between two catalogues, printed by the weekly data job in place of a reviewable diff.
import type { Show } from "../src/lib/catalogue.ts";

const MAX = 20;

export function changes(before: Show[], after: Show[]): string[] {
  const old = new Map(before.map((s) => [s.id, s]));
  const now = new Set(after.map((s) => s.id));
  const added = after.filter((s) => !old.has(s.id)).map((s) => s.name);
  const removed = before.filter((s) => !now.has(s.id)).map((s) => s.name);
  const status = after.flatMap((s) => {
    const was = old.get(s.id);
    return was && was.status !== s.status ? [`${s.name}: ${was.status} → ${s.status}`] : [];
  });
  const episodes = after.filter((s) => (old.get(s.id)?.episodes ?? s.episodes) !== s.episodes).length;
  const section = (title: string, names: string[]) =>
    names.length ? [`${title} (${names.length}): ${names.slice(0, MAX).join(", ")}${names.length > MAX ? ", …" : ""}`] : [];
  const lines = [...section("Added", added), ...section("Removed", removed), ...section("Status", status)];
  if (episodes) lines.push(`New episodes: ${episodes} shows`);
  return lines.length ? lines : ["No changes"];
}
