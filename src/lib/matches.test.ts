import assert from "node:assert/strict";
import { test } from "node:test";
import { topMatches, type PackedList } from "./matches.ts";

const pick = (n: number, valid = true) => ({
  title: `Pick ${n}`,
  year: 2000 + n,
  why: `Reason ${n}`,
  tvmaze: valid ? { id: n, name: `TVmaze name ${n}`, year: 2000 + n } : null,
});

test("only picks that checked out on TVmaze are shown, best first, under their TVmaze name", () => {
  const list: PackedList = { id: 99, model: "opus", ending: "planned", picks: [pick(1), pick(2, false), pick(3)] };
  assert.deepEqual(topMatches(list), [
    { id: 1, name: "TVmaze name 1", year: 2001, why: "Reason 1" },
    { id: 3, name: "TVmaze name 3", year: 2003, why: "Reason 3" },
  ]);
});

test("at most ten matches are shown", () => {
  const list: PackedList = { id: 99, model: "opus", ending: "planned", picks: Array.from({ length: 15 }, (_, i) => pick(i + 1)) };
  assert.equal(topMatches(list).length, 10);
});
