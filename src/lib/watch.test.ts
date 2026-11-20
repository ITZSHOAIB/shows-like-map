import assert from "node:assert/strict";
import { test } from "node:test";
import { watchUrl } from "./watch.ts";

test("it searches JustWatch India for the show's name, escaped", () => {
  assert.equal(watchUrl("Breaking Bad"), "https://www.justwatch.com/in/search?q=Breaking%20Bad");
  assert.equal(watchUrl("Law & Order: SVU"), "https://www.justwatch.com/in/search?q=Law%20%26%20Order%3A%20SVU");
});
