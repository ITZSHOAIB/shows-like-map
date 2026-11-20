// Filters on a show's matches (#3): finished only, and under N hours to finish. Each card carries what it passes as data
// attributes, set at build time, so CSS can filter without JavaScript. Matches without a page have no status or hours to
// check, so they pass nothing and hide while any filter is on.
import type { Show } from "./catalogue";

/** The hour limits offered. Under 10 h empties over half the rows (measured over the catalogue), so it isn't one. */
export const HOUR_LIMITS = [20, 40, 80] as const;

/** Cancelled shows count as finished: there's nothing more to wait for, and the card still says "Cancelled". */
export const isFinished = (show: Show) => show.status === "ended" || show.status === "cancelled";

/** The data attributes for a match's card: data-fin, and data-h20 and so on for each limit it's under. */
export function filterAttrs(show?: Show): Record<string, ""> {
  const attrs: Record<string, ""> = {};
  if (!show) return attrs;
  if (isFinished(show)) attrs["data-fin"] = "";
  for (const h of HOUR_LIMITS) if (show.minutes !== null && show.minutes < h * 60) attrs[`data-h${h}`] = "";
  return attrs;
}
