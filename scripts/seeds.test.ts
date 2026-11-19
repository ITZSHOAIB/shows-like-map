import assert from "node:assert/strict";
import { test } from "node:test";
import { selectSeeds } from "./seeds.ts";

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
