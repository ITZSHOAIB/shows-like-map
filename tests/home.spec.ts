// The home page (#4, decision 0008): the wall, the search, and the time chips that go with you to the show you open.
import { expect, test } from "@playwright/test";

const chip = (page: import("@playwright/test").Page, text: string) => page.locator("#time .f-chip", { hasText: text });

test("a search with a typo finds the show, and Enter opens it", async ({ page }) => {
  await page.goto("/");
  await page.locator("#q").fill("braking bad");
  await expect(page.locator("#results .tile").first()).toContainText("Breaking Bad");
  await expect(page.locator("#note")).toHaveText(/show(s)? found/);
  await page.locator("#q").fill("the");
  await expect(page.locator("#note")).toHaveText("The 18 closest shows");
  await page.locator("#q").fill("braking bad");
  await expect(page.locator("#results .tile").first()).toContainText("Breaking Bad");
  await expect(page.locator(".wall")).toBeHidden();
  await page.locator("#q").press("Enter");
  await expect(page).toHaveURL(/\/shows\/breaking-bad\/$/);
});

test("a search with no match says so and keeps the wall to tap from; Escape clears it", async ({ page }) => {
  await page.goto("/");
  await page.locator("#q").fill("xyzzy");
  await expect(page.locator("#note")).toHaveText("No show called “xyzzy” yet. Tap one you loved below.");
  await expect(page.locator(".wall")).toBeVisible();
  await page.locator("#q").fill("dark");
  await expect(page.locator(".wall")).toBeHidden();
  await page.locator("#q").press("Escape");
  await expect(page.locator("#q")).toHaveValue("");
  await expect(page.locator(".wall")).toBeVisible();
  await expect(page.locator("#results")).toBeHidden();
});

test("the time chosen shows a row that fits it, and goes with the show you open", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".fit")).toHaveCount(3);
  await expect(page.locator(".fit:visible")).toHaveCount(0);
  await chip(page, "Finished").click();
  await chip(page, "40 h").click();
  await expect(page.locator(".fit:visible h2")).toHaveText("Finished, and under 40 h");
  expect(await page.locator("#wall-title").innerText()).toBe("Or tap one you loved");
  await expect(page.locator("#note")).toHaveText("Every show you open lists matches that are finished and under 40 h.");

  await page.locator(".wall a.tile", { hasText: "Breaking Bad" }).click();
  await expect(page).toHaveURL(/\/shows\/breaking-bad\/$/);
  await expect(page.locator("#f-fin")).toBeChecked();
  await expect(page.locator("#f-h40")).toBeChecked();
  await expect(page.locator("#matches-count")).toHaveText(/^Showing \d+ of \d+$/);
});

test("filters chosen on a show page show on the home page's chips", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await page.locator(".filters .f-chip", { hasText: "20 h" }).click();
  await page.goto("/");
  await expect(page.locator("#f-h20")).toBeChecked();
  await expect(page.locator(".fit:visible h2")).toHaveText("Finished, and under 20 h");
});

test("tapping the chosen hours again turns it off", async ({ page }) => {
  await page.goto("/");
  await chip(page, "80 h").click();
  await expect(page.locator("#f-h80")).toBeChecked();
  await chip(page, "80 h").click();
  await expect(page.locator("#f-h80")).not.toBeChecked();
  await expect(page.locator(".fit:visible")).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("slm:filters"))).toBe('{"finished":false,"hours":0}');
});

test("Clear works from the keyboard and hands focus to the first chip", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".f-clear")).toBeHidden();
  await page.locator("#f-h20").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#f-h20")).toBeChecked();
  await page.locator(".f-clear").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#f-h20")).not.toBeChecked();
  await expect(page.locator("#time input").first()).toBeFocused();
  await expect(page.locator("#note")).toHaveText("Set your time, and every show you open lists only matches that fit it.");
});

test("without JavaScript the wall still works, and the search and chips stay out of the way", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("#finder")).toBeHidden();
  await expect(page.locator(".wall a.tile")).toHaveCount(36);
  await expect(page.locator(".wall a.tile").first()).toHaveAttribute("href", /^\/shows\/[a-z0-9-]+\/$/);
  await context.close();
});

// The grid of shows is three across on every phone, so a bigger phone gets bigger posters, never more and smaller ones.
test("on phones the grid is three across, and its posters grow with the screen", async ({ page }) => {
  let last = 0;
  for (const width of [320, 360, 390, 430, 520]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const tiles = page.locator(".tiles li");
    const tops = await tiles.evaluateAll((els) => els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops.slice(0, 3).every((t) => t === tops[0]) && tops[3] > tops[0]).toBe(true);
    const w = (await tiles.first().locator(".poster").boundingBox())!.width;
    expect(w).toBeGreaterThan(last);
    last = w;
  }
});
