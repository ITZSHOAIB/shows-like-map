// Wikidata SPARQL (CC0).
const ENDPOINT = "https://query.wikidata.org/sparql";

export async function sparql(query: string): Promise<Record<string, string>[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    body: new URLSearchParams({ query }),
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

export interface WikidataDetails {
  wikidata: string; // Q-id
  wikipedia: string | null; // English article URL
  creators: string[];
}

/** Wikidata id, English Wikipedia article and creators (P170) for the given TVmaze ids, 200 per query. */
export async function detailsByTvmaze(ids: number[]): Promise<Record<number, WikidataDetails>> {
  const out: Record<number, WikidataDetails> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const values = ids.slice(i, i + 200).map((id) => `"${id}"`).join(" ");
    const rows = await sparql(`SELECT ?tvmaze ?item ?article (GROUP_CONCAT(DISTINCT ?creator; separator="|") AS ?creators) WHERE {
      VALUES ?tvmaze { ${values} }
      ?item wdt:P8600 ?tvmaze.
      OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }
      OPTIONAL { ?item wdt:P170 ?c. ?c rdfs:label ?creator. FILTER(LANG(?creator) = "en") }
    } GROUP BY ?tvmaze ?item ?article`);
    for (const r of rows) {
      const id = Number(r.tvmaze);
      if (out[id]) continue; // a TVmaze id on two Wikidata items: keep the first
      out[id] = { wikidata: r.item.split("/").pop()!, wikipedia: r.article ?? null, creators: r.creators ? r.creators.split("|") : [] };
    }
  }
  return out;
}
