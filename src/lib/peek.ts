// Hold-to-peek (#3, decision 0007): what holding a match's card shows before you hop to it. Built per page at build
// time, for the matches that have a page of their own.
import { hours, STATUS_LABEL, type Show } from "./catalogue.ts";
import type { Match } from "./matches.ts";

export interface PeekLead { slug: string; name: string; poster: string | null }
export interface Peek {
  name: string;
  poster: string | null;
  facts: string[]; // status, hours to finish, year, network: the ones known
  why: string; // why it's like the show whose page this is, or, a step further out, like the match it came via
  via?: string; // a step further out: the match of this page's show that leads to it
  summary: string | null;
  leads: PeekLead[]; // where it leads: its own top matches
}

/** How many of a match's own matches it shows: one row of small posters on a phone. */
export const PEEK_LEADS = 4;

/**
 * The peek at `show`, a match of `here`. `next` is the show's own matches that have pages, best first. A show a step
 * further out passes `via`, the match of `here` that lists it, since `match.why` is about that one.
 */
export function peekOf(here: Show, match: Match, show: Show, next: Show[], via?: string): Peek {
  return {
    ...(via && { via }),
    name: show.name,
    poster: show.poster,
    facts: [
      STATUS_LABEL[show.status],
      show.minutes !== null ? `${hours(show.minutes)} to finish` : "",
      show.premiered?.slice(0, 4) ?? "",
      show.platform ?? "",
    ].filter(Boolean),
    why: match.why,
    summary: show.summary,
    // The way back to `here` isn't somewhere new to go.
    leads: next.filter((s) => s.id !== here.id).slice(0, PEEK_LEADS).map((s) => ({ slug: s.slug, name: s.name, poster: s.poster })),
  };
}
