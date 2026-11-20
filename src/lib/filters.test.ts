import assert from "node:assert/strict";
import { test } from "node:test";
import type { Show } from "./catalogue.ts";
import { filterAttrs } from "./filters.ts";

const show = (status: Show["status"], minutes: number | null) => ({ status, minutes }) as Show;

test("ended and cancelled shows are finished; running and uncertain ones aren't", () => {
  assert.ok("data-fin" in filterAttrs(show("ended", 600)));
  assert.ok("data-fin" in filterAttrs(show("cancelled", 600)));
  assert.ok(!("data-fin" in filterAttrs(show("running", 600))));
  assert.ok(!("data-fin" in filterAttrs(show("uncertain", 600))));
});

test("a show is under every hour limit above its runtime, and exactly 20 hours isn't under 20", () => {
  assert.deepEqual(Object.keys(filterAttrs(show("running", 25 * 60))), ["data-h40", "data-h80"]);
  assert.deepEqual(Object.keys(filterAttrs(show("running", 20 * 60))), ["data-h40", "data-h80"]);
  assert.deepEqual(Object.keys(filterAttrs(show("running", 19 * 60))), ["data-h20", "data-h40", "data-h80"]);
});

test("unknown runtimes and matches without a page pass no filter", () => {
  assert.deepEqual(filterAttrs(show("running", null)), {});
  assert.deepEqual(filterAttrs(undefined), {});
});
