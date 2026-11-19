import assert from "node:assert/strict";
import { test } from "node:test";
import type { Show } from "../src/lib/catalogue.ts";
import { changes } from "./catalogue-changes.ts";

const show = (id: number, name: string, status: Show["status"] = "ended", episodes = 10) => ({ id, name, status, episodes }) as Show;

test("lists added and removed shows, status changes and new episodes", () => {
  const before = [show(1, "Dark"), show(2, "Severance", "running", 19), show(3, "Z Nation")];
  const after = [show(1, "Dark"), show(2, "Severance", "running", 29), show(3, "Z Nation", "cancelled"), show(4, "Pluribus", "running")];
  assert.deepEqual(changes(before, after), ["Added (1): Pluribus", "Status (1): Z Nation: ended → cancelled", "New episodes: 1 shows"]);
  assert.deepEqual(changes(after, before), ["Removed (1): Pluribus", "Status (1): Z Nation: cancelled → ended", "New episodes: 1 shows"]);
});

test("says so when nothing changed", () => {
  assert.deepEqual(changes([show(1, "Dark")], [show(1, "Dark")]), ["No changes"]);
});
