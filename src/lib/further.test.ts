import assert from "node:assert/strict";
import { test } from "node:test";
import type { Show } from "./catalogue.ts";
import { furtherOut } from "./further.ts";
import type { Match } from "./matches.ts";

const show = (id: number, more: Partial<Show> = {}) => ({ id, name: `S${id}`, status: "ended", minutes: 600, ...more }) as Show;
const m = (id: number): Match => ({ id, name: `S${id}`, year: 2000, why: `why ${id}` });

test("shows two steps away, never the show itself or a direct match, ranked by how many matches lead there", () => {
  const byId = new Map([1, 2, 3, 4, 5].map((i) => [i, show(i)]));
  const lists = new Map([[2, [m(1), m(3), m(5)]], [3, [m(2), m(5), m(4)]]]);
  const out = furtherOut(show(1), [m(2), m(3)], lists, byId);
  assert.deepEqual(out.map((f) => f.show.id), [5, 4]);
  assert.equal(out[0].via, "S2");
});

test("every filter finds some: the pool keeps the best finished shows under each hour limit", () => {
  const shows = [show(1), show(2), ...Array.from({ length: 20 }, (_, i) => show(10 + i, { minutes: 3000 })), show(40, { minutes: 300 }), show(41, { status: "running", minutes: 300 })];
  const byId = new Map(shows.map((s) => [s.id, s]));
  const lists = new Map([[2, [...Array.from({ length: 20 }, (_, i) => m(10 + i)), m(41), m(40)]]]);
  const out = furtherOut(show(1), [m(2)], lists, byId).map((f) => f.show.id);
  assert.ok(out.includes(40), "the short finished show is kept though twenty long ones outrank it");
  assert.ok(!out.includes(41), "a running show isn't in a pool that serves 'finished'");
  assert.ok(out.length <= 8 + 8 + 8 + 8);
});

test("matches outside the catalogue are skipped", () => {
  const out = furtherOut(show(1), [m(2)], new Map([[2, [m(99)]]]), new Map([[1, show(1)], [2, show(2)]]));
  assert.deepEqual(out, []);
});
