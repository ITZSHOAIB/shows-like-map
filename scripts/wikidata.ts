// Wikidata SPARQL (CC0).
const ENDPOINT = "https://query.wikidata.org/sparql";

export async function sparql(query: string): Promise<Record<string, string>[]> {
  const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": "ShowsLikeMap/0.1 (+https://showslikemap.sohab.dev)" },
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL: HTTP ${res.status}`);
  const json: any = await res.json();
  return json.results.bindings.map((row: any) => Object.fromEntries(Object.entries(row).map(([k, v]: [string, any]) => [k, v.value])));
}

/** Sitelinks (Wikipedia language editions with an article) per TVmaze id: a measure of lasting, global popularity. */
export async function sitelinksByTvmaze(): Promise<Record<number, number>> {
  const rows = await sparql("SELECT ?tvmaze ?links WHERE { ?item wdt:P8600 ?tvmaze; wikibase:sitelinks ?links }");
  const out: Record<number, number> = {};
  for (const { tvmaze, links } of rows) out[Number(tvmaze)] = Math.max(out[Number(tvmaze)] ?? 0, Number(links));
  return out;
}
