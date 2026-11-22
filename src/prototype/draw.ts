// PROTOTYPE (payoff-prototype): scales and paths for the payoff pictures, drawn at build time as plain SVG.
import { CEIL, FLOOR, smooth, type Arc } from "./arc";

const clamp = (v: number) => Math.min(CEIL, Math.max(FLOOR, v));
/** Every chart shares the 6–9.5 window (see arc.ts), whatever the show. */
export const yOf = (h: number) => (v: number) => h - ((clamp(v) - FLOOR) / (CEIL - FLOOR)) * h;

export const line = (pts: { x: number; y: number }[]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");

/** The smoothed episode line across the run, x in hours, broken between seasons (each season is its own chapter). */
export function road(arc: Arc, w: number, h: number) {
  const x = (hrs: number) => (hrs / arc.hours) * w, y = yOf(h);
  const pts = smooth(arc.episodes);
  const bySeason = arc.seasons.map((s) => pts.filter((p) => p.x >= s.start && p.x <= s.end).map((p) => ({ x: x(p.x), y: y(p.y) })));
  const paths = bySeason.filter((s) => s.length).map(line);
  const area = bySeason.filter((s) => s.length).map((s) => `${line(s)}L${s.at(-1)!.x.toFixed(1)},${h}L${s[0].x.toFixed(1)},${h}Z`);
  return { x, y, paths, area };
}

/** A word-sized line: season averages, or the smoothed episodes for a single season. */
export function spark(arc: Arc, w: number, h: number) {
  const y = yOf(h);
  const judged = arc.seasons.filter((s) => s.mean !== null);
  const vals = judged.length >= 2 ? judged.map((s) => s.mean!) : smooth(arc.episodes).map((p) => p.y);
  return line(vals.map((v, i) => ({ x: vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * w, y: y(v) })));
}
