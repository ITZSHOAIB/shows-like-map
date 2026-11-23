// Details for a show card's hold-to-peek, fetched only when someone holds a card outside a recommendation row.
import type { APIRoute } from "astro";
import { loadCatalogue } from "../../lib/catalogue";
import { loadMatches } from "../../lib/matches";
import { peekFor } from "../../lib/peek";

export function getStaticPaths() {
  const catalogue = loadCatalogue();
  const byId = new Map(catalogue.map((show) => [show.id, show]));
  const matches = loadMatches();
  return catalogue.map((show) => ({
    params: { slug: show.slug },
    props: {
      peek: peekFor(show, (matches.get(show.id) ?? []).flatMap((match) => byId.get(match.id) ?? [])),
    },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.peek), { headers: { "Content-Type": "application/json; charset=utf-8" } });
