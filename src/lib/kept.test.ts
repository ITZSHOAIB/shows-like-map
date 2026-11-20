import assert from "node:assert/strict";
import { test } from "node:test";
import { fromShare, KEPT_MAX, merged, shareUrl, toggled } from "./kept.ts";

test("keeping puts a show first, keeping it again takes it off, and the list stops at the limit", () => {
  assert.deepEqual(toggled(["dark"], "breaking-bad"), ["breaking-bad", "dark"]);
  assert.deepEqual(toggled(["breaking-bad", "dark"], "breaking-bad"), ["dark"]);
  const full = Array.from({ length: KEPT_MAX }, (_, i) => `s${i}`);
  assert.equal(toggled(full, "new").length, KEPT_MAX);
  assert.equal(toggled(full, "new")[0], "new");
});

test("a shared link round-trips, any script and all", () => {
  const list = ["breaking-bad", "слуга-народа", "muhtesem-yuzyıl"];
  const url = new URL(shareUrl("https://showslikemap.sohab.dev", list));
  assert.equal(url.pathname, "/kept/");
  assert.deepEqual(fromShare(url.search), list);
});

test("a shared link is tidied: no blanks, no repeats, no runaway length; no link is not an empty list", () => {
  assert.deepEqual(fromShare("?s=dark,,dark, fleabag "), ["dark", "fleabag"]);
  assert.equal(fromShare("?s=" + Array.from({ length: 300 }, (_, i) => `s${i}`).join(","))!.length, KEPT_MAX);
  assert.equal(fromShare(""), null);
  assert.deepEqual(fromShare("?s="), []);
});

test("keeping all of a shared list puts theirs first and keeps yours, without repeats", () => {
  assert.deepEqual(merged(["dark", "fleabag"], ["succession", "dark"]), ["succession", "dark", "fleabag"]);
});
