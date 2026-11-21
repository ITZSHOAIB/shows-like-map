// The TVmaze rating: a fact pill on the show page and in the peek, only when TVmaze has one.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CATALOGUE, type Show } from "../src/lib/catalogue.ts";

const show = (slug: string) => (JSON.parse(readFileSync(CATALOGUE, "utf8")) as Show[]).find((s) => s.slug === slug)!;

test("a show TVmaze rates says so in its facts, credited to TVmaze", async ({ page }) => {
  // The stored catalogue gains ratings at the first data run after this change; until then there's nothing to show.
  test.skip(!("rating" in show("breaking-bad")), "the catalogue predates ratings: run the data job");
  await page.goto("/shows/breaking-bad/");
  const pill = page.locator(".pill.rating");
  const r = show("breaking-bad").rating;
  // Seen: a gold star, "9.2/10", then "TVmaze" small. Heard: the same as a sentence.
  await expect(pill.locator(".r-num")).toHaveText(String(r));
  await expect(pill.locator(".r-by")).toHaveText("TVmaze");
  await expect(pill).toMatchAriaSnapshot(`- listitem: Rated ${r} out of 10 on TVmaze`);
});

test("holding a rated match peeks at its rating too, right after its hours", async ({ page }) => {
  test.skip(!("rating" in show("breaking-bad")), "the catalogue predates ratings: run the data job");
  await page.goto("/shows/breaking-bad/");
  const card = page.locator(".row:not(.further) a.card[href$=\"/better-call-saul/\"]");
  await card.scrollIntoViewIfNeeded();
  const b = (await card.locator(".poster").boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  const pill = page.getByRole("dialog").locator(".pill.rating");
  await expect(pill).toMatchAriaSnapshot(`- listitem: Rated ${show("better-call-saul").rating} out of 10 on TVmaze`);
  await expect(pill.locator("xpath=preceding-sibling::li[1]")).toContainText("to finish");
});

test("a show TVmaze hasn't rated shows no rating, rather than a blank or a zero", async ({ page }) => {
  expect(show("panchayat").rating ?? null).toBeNull();
  await page.goto("/shows/panchayat/");
  await expect(page.locator(".pill.badge")).toBeVisible();
  await expect(page.locator(".pill.rating")).toHaveCount(0);
});
