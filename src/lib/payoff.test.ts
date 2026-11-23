import assert from "node:assert/strict";
import { test } from "node:test";
import type { Run } from "./catalogue.ts";
import { arcOf, computeArc, hoursLabel, seasonName, seasonTag } from "./payoff.ts";

/** A run of seasons, each a list of episode ratings, every episode an hour long. */
const run = (...seasons: (number | null)[][]): Run => seasons.flatMap((eps, i) => eps.map((r): Run[number] => [i + 1, 60, r]));

test("a steady show holds up and ends properly", () => {
  const a = computeArc(run([8.4, 8.5, 8.3], [8.5, 8.4, 8.6], [8.4, 8.5, 8.5]), "ended");
  assert.equal(a.shape, "Holds up");
  assert.equal(a.verdict, "Great all the way through · ends properly");
  assert.equal(a.hours, 9);
});

test("a weak first season that later ones rise clear of is a slow burn", () => {
  const a = computeArc(run([7, 7.1, 7], [8.2, 8.3, 8.2], [8.4, 8.5, 8.4]), "ended");
  assert.equal(a.shape, "Slow burn");
  assert.deepEqual(a.slowStart, { season: 2, hours: 3 });
  assert.equal(a.best!.n, 3);
});

test("a lasting drop after strong seasons fades, unless it's an anthology", () => {
  const seasons = [[8.6, 8.7, 8.6], [8.7, 8.6, 8.7], [7.6, 7.5, 7.6], [7.5, 7.4, 7.5]];
  const a = computeArc(run(...seasons), "ended");
  assert.equal(a.shape, "Peaks early");
  assert.deepEqual(a.fadeAfter, { season: 2, hours: 6 });
  const b = computeArc(run(...seasons), "ended", true);
  assert.equal(b.fadeAfter, null);
  assert.equal(b.shape, "Varies by season");
});

test("too few ratings is said, not guessed", () => {
  const a = computeArc(run([8, null, null, null, null]), "running");
  assert.equal(a.enough, false);
  assert.equal(a.verdict, "Not enough episode ratings yet");
});

test("one season counts its episodes, and a show without a run has no curve", () => {
  const a = computeArc(run([7.6, 7.6, 7.7, 8.4, 8.5, 8.4, 8.5, 8.4]), "ended");
  assert.deepEqual(a.episodes.map((e) => e.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(a.slowStart?.episode, 4);
  assert.equal(arcOf({ run: null, status: "ended" }), null);
  assert.equal(arcOf({ status: "ended" }), null);
});

test("hours read as the site writes them", () => {
  assert.equal(hoursLabel(0.75), "45 min");
  assert.equal(hoursLabel(2.3), "2.5 h");
  assert.equal(hoursLabel(62.4), "62 h");
});

test("a season numbered by year is called by its year", () => {
  assert.equal(seasonName(3), "season 3");
  assert.equal(seasonName(3, true), "Season 3");
  assert.equal(seasonName(2005, true), "2005");
  assert.equal(seasonTag(3), "S3");
  assert.equal(seasonTag(2005), "2005");
  const years = run([7, 7, 7], [8.5, 8.5, 8.5], [8.4, 8.4, 8.4]).map(([s, m, r]): Run[number] => [s + 2003, m, r]);
  assert.match(computeArc(years, "running").verdict, /from 2005 ·/);
});
