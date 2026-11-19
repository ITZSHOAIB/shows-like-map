import assert from "node:assert/strict";
import { test } from "node:test";
import { saysCancelled } from "./wikipedia.ts";

test("the series itself being cancelled counts", () => {
  assert.ok(saysCancelled("Z Nation", "On December 22, 2018, Syfy cancelled the series after five seasons."));
  assert.ok(saysCancelled("The Following", "On May 8, 2015, Fox canceled The Following after three seasons."));
  assert.ok(saysCancelled("Masters of Sex", "The series was canceled by Showtime on November 30, 2016, after four seasons."));
  assert.ok(saysCancelled("Marvel's Iron Fist", "Netflix cancelled Iron Fist on October 12, 2018."));
});

test("other things being cancelled don't", () => {
  assert.ok(!saysCancelled("Game of Thrones", "Commentators said many viewers might cancel their premium television and streaming subscriptions."));
  assert.ok(!saysCancelled("Two and a Half Men", "The network canceled the remainder of the season."));
  assert.ok(!saysCancelled("Monk", "Smash, NBC's now-cancelled musical series, hired him."));
  assert.ok(!saysCancelled("Heroes", "The planned third volume, Exodus, was cancelled."));
});
