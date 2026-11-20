import assert from "node:assert/strict";
import { test } from "node:test";
import type { Show } from "./catalogue.ts";
import { forGrownUps, rowsOf, wallOf } from "./home.ts";

const show = (name: string, more: Partial<Show> = {}) =>
  ({ id: 0, slug: name, name, premiered: "2010-01-01", status: "ended", minutes: 10 * 60, genres: [], platform: null, ...more }) as Show;

test("kids' shows are left out, whether the genre or the network says so", () => {
  assert.equal(forGrownUps(show("Liv & Maddie", { genres: ["Comedy", "Family"] })), false);
  assert.equal(forGrownUps(show("Gravity Falls", { platform: "Disney XD" })), false);
  assert.equal(forGrownUps(show("Adventure Time", { platform: "Cartoon Network" })), false);
  assert.equal(forGrownUps(show("Sherlock", { platform: "BBC One" })), true);
});

test("the wall puts the picks first, then popular grown-up shows", () => {
  const catalogue = [show("SpongeBob", { platform: "Nickelodeon" }), show("Friends"), show("Breaking Bad", { premiered: "2008-01-20" })];
  assert.deepEqual(wallOf(catalogue).map((s) => s.name), ["Breaking Bad", "Friends"]);
});

test("a time row holds only finished shows under its limit, so its label is true", () => {
  const catalogue = [
    show("Long", { minutes: 70 * 60 }),
    show("Ongoing", { status: "running" }),
    show("Short"),
    show("Cancelled", { status: "cancelled", minutes: 30 * 60 }),
    show("Unknown", { minutes: null }),
  ];
  const rows = rowsOf(catalogue);
  assert.deepEqual(rows[20].map((s) => s.name), ["Short"]);
  assert.deepEqual(rows[40].map((s) => s.name), ["Short", "Cancelled"]);
  assert.deepEqual(rows[80].map((s) => s.name), ["Long", "Short", "Cancelled"]);
});
