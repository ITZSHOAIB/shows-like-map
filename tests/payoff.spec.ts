// Is it worth getting through? The payoff skyline on a show page (epic #42, decision 0014).
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CATALOGUE, type Show } from "../src/lib/catalogue.ts";
import { arcOf } from "../src/lib/payoff.ts";

const shows = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Show[];
const show = (slug: string) => shows.find((s) => s.slug === slug)!;
// The stored catalogue gains runs at the first data run after this change; until then there's no curve to show.
const noRuns = !("run" in show("breaking-bad"));

test("the words come first, and tapping a season lifts it and says what it is", async ({ page }) => {
  test.skip(noRuns, "the catalogue predates runs: run the data job");
  await page.goto("/shows/breaking-bad/");
  const sky = page.locator(".sky");
  await expect(sky.getByRole("heading", { name: "Is it worth getting through?" })).toBeVisible();
  await expect(sky.locator(".sky-verdict")).toHaveText(arcOf(show("breaking-bad"))!.verdict);
  await sky.scrollIntoViewIfNeeded();
  const s3 = sky.getByRole("button", { name: /^S3, Season 3 · / });
  await s3.click();
  await expect(s3).toHaveAttribute("aria-pressed", "true");
  await expect(sky.locator(".sky-say")).toContainText("Season 3 ·");
  await expect(sky.locator('.sky-block[data-spot="s3"]').first()).toHaveClass(/\bup\b/);
  await s3.click();
  await expect(s3).toHaveAttribute("aria-pressed", "false");
  await expect(sky.locator(".sky-say")).toHaveText("Tap a season to see what it is.");
});

test("a show too thinly rated to judge says so instead of drawing a guess", async ({ page }) => {
  const thin = shows.find((s) => { const a = arcOf(s); return a && !a.enough; });
  test.skip(!thin, "the catalogue predates runs: run the data job");
  await page.goto(`/shows/${thin!.slug}/`);
  await expect(page.locator(".payoff-none")).toHaveText("Not enough episode ratings yet to say how it plays out.");
  await expect(page.locator(".sky")).toHaveCount(0);
});

test("a long run is drawn a season to a building, and a season numbered by year is called by its year", async ({ page }) => {
  test.skip(noRuns, "the catalogue predates runs: run the data job");
  const s = show("one-piece-1999");
  await page.goto("/shows/one-piece-1999/");
  const seasons = new Set(s.run!.map(([n]) => n)).size;
  await expect(page.locator(".sky-roofs path:not(.pane)")).toHaveCount(seasons);
  await expect(page.locator(".sky-spots button").first()).toHaveAccessibleName(new RegExp(`^${s.run![0][0]} · `));
  await expect(page.locator(".sky")).not.toContainText(/season 20\d\d/i);
});

test("without JavaScript the skyline is there, already risen", async ({ browser }) => {
  test.skip(noRuns, "the catalogue predates runs: run the data job");
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto("/shows/breaking-bad/");
  await page.locator(".sky").scrollIntoViewIfNeeded();
  await expect(page.locator(".sky-tiles")).toBeVisible();
  await expect(page.locator(".sky-spots button span").first()).toHaveCSS("opacity", "1");
  await page.close();
});
