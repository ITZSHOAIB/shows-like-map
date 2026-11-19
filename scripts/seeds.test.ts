import assert from "node:assert/strict";
import { test } from "node:test";
import type { PackedList } from "../src/lib/matches.ts";
import { ringIds, selectSeeds } from "./seeds.ts";

const show = (id: number, weight: number, extra: object = {}) => ({ id, weight, type: "Scripted", status: "Ended", premiered: "2020-01-01", ...extra });

test("seeds are the eligible (not kids') shows with the most Wikipedia editions, ties broken by TVmaze weight", () => {
  const index = [
    show(1, 99),
    show(2, 40),
    show(3, 70),
    show(4, 80),
    show(5, 99, { type: "Reality" }),
    show(6, 99, { status: "In Development" }),
    show(7, 99, { premiered: null }),
    show(8, 99), // not on Wikidata
    show(9, 99, { genres: ["Children"] }),
  ];
  const sitelinks = { 1: 10, 2: 150, 3: 60, 4: 60, 5: 200, 6: 200, 7: 200, 9: 200 };
  assert.deepEqual(selectSeeds(index, sitelinks, 3), [2, 4, 3]);
});

test("the ring is the eligible shows among seed pages' shown picks, never picks from the ring's own lists", () => {
  const index = [show(1, 0), show(2, 0), show(3, 0), show(4, 0, { genres: ["Children"] }), show(5, 0), show(6, 0), show(7, 0)];
  const pick = (id: number | null) => ({ title: `t${id}`, year: 2020, why: "", tvmaze: id ? { id, name: `n${id}`, year: 2020 } : null });
  const lists: PackedList[] = [
    // Seed 1 shows its first 3 valid picks (2, 4, 3): seed 2 already has a page and kids' show 4 gets none.
    { id: 1, model: "opus", ending: "planned", picks: [pick(2), pick(null), pick(4), pick(3), pick(5), pick(6)] },
    // Ring show 3's own list must not add a second ring.
    { id: 3, model: "opus", ending: "planned", picks: [pick(7)] },
  ];
  assert.deepEqual(ringIds([1, 2], lists, index, 3), [3]);
});
