// The search index (#4): every show as a compact row, fetched by the home page the first time someone searches.
// About 150 KB, 53 KB compressed, so it stays out of the page itself.
import type { APIRoute } from "astro";
import { loadCatalogue } from "../lib/catalogue";
import { entryOf } from "../lib/search-index";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(loadCatalogue().map(entryOf)), { headers: { "Content-Type": "application/json" } });
