// PROTOTYPE (open-data stack): look up the eval shows on TVmaze and write them as seeds for gen-similar.ts.
// Usage: node scripts/open/seed-eval.ts > data/open/seeds-eval.json
import { GOLD } from "../eval-gold.ts";
import { resolve } from "./tvmaze.ts";

const seeds = [];
for (const name of Object.keys(GOLD)) {
  const s = await resolve(name);
  if (!s) { console.error(`not on TVmaze: ${name}`); continue; }
  const channel = s.webChannel ?? s.network;
  seeds.push({
    id: s.id, name: s.name, year: Number(s.premiered?.slice(0, 4)) || null,
    platform: channel?.name ?? null, country: (channel?.country ?? s.network?.country)?.code ?? null,
  });
}
console.log(JSON.stringify(seeds, null, 1));
