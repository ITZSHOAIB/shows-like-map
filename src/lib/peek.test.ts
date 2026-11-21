import assert from "node:assert/strict";
import { test } from "node:test";
import type { Show } from "./catalogue.ts";
import { peekOf } from "./peek.ts";

const show = (id: number, more: Partial<Show> = {}) =>
  ({ id, slug: `s${id}`, name: `Show ${id}`, poster: null, status: "ended", minutes: null, premiered: null, platform: null, summary: null, ...more }) as Show;
const match = { id: 2, name: "Show 2", year: 2008, why: "Same desert, same slow fall" };

test("the facts are status, hours, rating, year and network, leaving out the unknown ones", () => {
  const full = show(2, { status: "cancelled", minutes: 62 * 60, rating: 9.2, premiered: "2008-01-20", platform: "AMC" });
  assert.deepEqual(peekOf(show(1), match, full, []).facts, ["Cancelled", "62 h to finish", "9.2 on TVmaze", "2008", "AMC"]);
  assert.deepEqual(peekOf(show(1), match, show(2, { status: "running" }), []).facts, ["Ongoing"]);
});

test("it leads to the match's own matches, at most four, never back to the page it's on", () => {
  const leads = peekOf(show(1), match, show(2), [show(3), show(1), show(4), show(5), show(6), show(7)]).leads;
  assert.deepEqual(leads.map((l) => l.slug), ["s3", "s4", "s5", "s6"]);
});

test("it says why the match is like the page's show", () => {
  assert.equal(peekOf(show(1), match, show(2), []).why, "Same desert, same slow fall");
});
