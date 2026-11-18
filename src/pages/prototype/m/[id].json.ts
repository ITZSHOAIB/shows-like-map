// PROTOTYPE: one show's top matches, fetched when a Rabbit hole row unfolds or a peek fan opens.
import type { APIRoute } from "astro";
import { matches, shows, toM, type Show } from "../../../lib/data";
import type { Branch } from "../../../lib/explore";

export function getStaticPaths() {
  return shows.map((show) => ({ params: { id: String(show.id) }, props: { show } }));
}

export const GET: APIRoute = ({ props }) => {
  const { show } = props as { show: Show };
  const body: Branch = {
    id: show.id, slug: show.slug, name: show.name, poster: show.poster,
    matches: matches(show).slice(0, 24).map((m) => toM(m.show, m.reasons)),
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
};
