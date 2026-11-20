// Filters on a show's matches (#3): finished only and under N hours. CSS does the filtering, so it works without
// JavaScript; JavaScript adds the count, the announcement, and remembers the choice for the next show.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const cards = (page: Page) => page.locator(".row:not(.further) .track li:visible");
const finished = (page: Page) => page.getByRole("checkbox", { name: "Finished" });
const hours = (page: Page, h: number) => page.getByRole("radiogroup", { name: "Hours to finish" }).getByRole("radio", { name: `Under ${h} h` });

test("filters hide what doesn't pass, count what's left, and Clear brings it all back", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(cards(page)).toHaveCount(10);

  await finished(page).check();
  await hours(page, 40).check();
  await expect(cards(page)).toHaveCount(1); // Narcos: ended, 26 hours
  await expect(page.locator("#matches-count")).toHaveText("Showing 1 of 10");
  await expect(page.locator("#filters-status")).toHaveText("Showing 1 of 10");

  await hours(page, 20).check();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator("#filters-status")).toHaveText("None match your filters");
  const clear = page.getByRole("button", { name: "Clear filters" });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(cards(page)).toHaveCount(10);
  await expect(page.locator("#matches-count")).toHaveText("");
  await expect(finished(page)).toBeFocused(); // not lost with the button that hid itself
});

test("Clear in the filter bar shows only while a filter is on, and hands focus back", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  const clear = page.locator("#filters").getByRole("button", { name: "Clear", exact: true });
  await expect(clear).toBeHidden();
  await hours(page, 80).check();
  await expect(clear).toBeVisible();
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(hours(page, 80)).not.toBeChecked();
  await expect(clear).toBeHidden();
  await expect(finished(page)).toBeFocused();
});

test("tapping the chosen hours again turns it off", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await hours(page, 40).click();
  await expect(cards(page)).toHaveCount(2);
  await hours(page, 40).click();
  await expect(hours(page, 40)).not.toBeChecked();
  await expect(cards(page)).toHaveCount(10);
  await expect(page.locator("#filters-status")).toHaveText("Showing all 10");
});

test("the filters work without JavaScript", async ({ browser }) => {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto("/shows/breaking-bad/");
  await page.getByText("Finished", { exact: true }).click();
  await expect(cards(page)).toHaveCount(8);
  await hours(page, 20).click();
  await expect(page.getByText("None match your filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(cards(page)).toHaveCount(10);
  await page.close();
});

test("the next show opens already filtered, from the first frame with cards", async ({ page }) => {
  // The first frame the next page paints with its cards in it (they're further down than the first paint reaches).
  await page.addInitScript(() => {
    const frame = () => {
      const all = document.querySelectorAll(".row:not(.further) .track li");
      if (!all.length) return requestAnimationFrame(frame);
      const shown = [...all].filter((li) => getComputedStyle(li).display !== "none").length;
      sessionStorage.setItem("first-frame", `${shown}/${all.length}`);
    };
    requestAnimationFrame(frame);
  });
  await page.goto("/shows/breaking-bad/");
  await finished(page).check();
  await page.locator(".row:not(.further) .track a").first().click();
  await expect(page).toHaveURL(/better-call-saul/);
  await expect(finished(page)).toBeChecked();
  const now = await cards(page).count();
  expect(now).toBeLessThan(await page.locator(".row:not(.further) .track li").count());
  expect(await page.evaluate(() => sessionStorage.getItem("first-frame"))).toBe(`${now}/10`);
  await expect(page.locator("#matches-count")).toHaveText(`Showing ${now} of 10`);
});

test("a new tab starts with no filters on", async ({ page, context }) => {
  await page.goto("/shows/breaking-bad/");
  await finished(page).check();
  const other = await context.newPage();
  await other.goto("/shows/better-call-saul/");
  await expect(finished(other)).not.toBeChecked();
  await expect(other.locator(".row:not(.further) .track li:visible")).toHaveCount(10);
});

test("filter controls have names, a group, and targets of at least 24px", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(page.getByRole("form", { name: "Filter shows" })).toBeVisible();
  for (const h of [20, 40, 80]) await expect(hours(page, h)).not.toBeChecked(); // none chosen: any length
  for (const chip of await page.locator(".f-chip").all()) {
    if (await chip.isVisible()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  }
  // The arrow keys move through the hours, as in any radio group.
  await hours(page, 20).check();
  await page.keyboard.press("ArrowRight");
  await expect(hours(page, 40)).toBeChecked();
});

test("filtered and empty rows pass axe and fit 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/shows/breaking-bad/");
  await finished(page).check();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  await hours(page, 20).check();
  await expect(page.getByText("None match your filters.")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("a row with nothing to filter on has no filters", async ({ page }) => {
  await page.goto("/shows/planet-earth/");
  await expect(page.locator("#filters")).toHaveCount(0);
});

// In forced colours a chip's own fill is dropped, so "on" has to come through as the system's highlight.
test("an active filter stands out in forced colours", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/shows/breaking-bad/");
  await finished(page).check();
  const bg = (sel: string) => page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundColor);
  const on = await bg(".f-chip:has(#f-fin)"), off = await bg(".f-chip:has(#f-h20)");
  expect(on).not.toBe(off);
  await expect(page.locator(".f-chip:has(#f-h20)")).toHaveCSS("border-top-style", "solid");
  // An "on" chip keeps its own colours, ring included, so the ring must be a system colour: our yellow vanishes on white.
  await finished(page).blur();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(finished(page)).toBeFocused();
  const chip = page.locator(".f-chip:has(#f-fin)");
  await expect(chip).toHaveCSS("outline-style", "solid");
  await expect(chip).not.toHaveCSS("outline-color", "rgb(255, 211, 107)");
});
