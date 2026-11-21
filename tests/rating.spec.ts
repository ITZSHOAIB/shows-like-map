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
  await expect(pill).toHaveText(`Rated ${show("breaking-bad").rating} on TVmaze`, { useInnerText: true });
  await expect(pill.locator("svg")).toHaveAttribute("aria-hidden", "true");
});

test("a show TVmaze hasn't rated shows no rating, rather than a blank or a zero", async ({ page }) => {
  expect(show("panchayat").rating ?? null).toBeNull();
  await page.goto("/shows/panchayat/");
  await expect(page.locator(".pill.badge")).toBeVisible();
  await expect(page.locator(".pill.rating")).toHaveCount(0);
});
