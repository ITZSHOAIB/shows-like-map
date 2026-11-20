// Filters on a show's matches (#3): finished only and under N hours. CSS does the filtering, so it works without
// JavaScript; JavaScript adds the count, the announcement, and remembers the choice for the next show.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const cards = (page: Page) => page.locator(".track li:visible");
const finished = (page: Page) => page.getByRole("checkbox", { name: "Finished" });
const hours = (page: Page) => page.getByRole("combobox", { name: "Hours to finish" });

test("filters hide what doesn't pass, count what's left, and Clear brings it all back", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(cards(page)).toHaveCount(10);

  await finished(page).check();
  await hours(page).selectOption("40");
  await expect(cards(page)).toHaveCount(1); // Narcos: ended, 26 hours
  await expect(page.locator("#matches-count")).toHaveText("· 1 of 10");
  await expect(page.locator("#filters-status")).toHaveText("Showing 1 of 10");

  await hours(page).selectOption("20");
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
  const clear = page.locator("#filters").getByRole("button", { name: "Clear" });
  await expect(clear).toBeHidden();
  await hours(page).selectOption("80");
  await expect(clear).toBeVisible();
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(hours(page)).toHaveValue("0");
  await expect(clear).toBeHidden();
  await expect(finished(page)).toBeFocused();
});

test("the filters work without JavaScript", async ({ browser }) => {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto("/shows/breaking-bad/");
  await page.getByText("Finished", { exact: true }).click();
  await expect(cards(page)).toHaveCount(8);
  await hours(page).selectOption("20");
  await expect(page.getByText("None match your filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(cards(page)).toHaveCount(10);
  await page.close();
});

test("the next show opens already filtered, from the first frame with cards", async ({ page }) => {
  // The first frame the next page paints with its cards in it (they're further down than the first paint reaches).
  await page.addInitScript(() => {
    const frame = () => {
      const all = document.querySelectorAll(".track li");
      if (!all.length) return requestAnimationFrame(frame);
      const shown = [...all].filter((li) => getComputedStyle(li).display !== "none").length;
      sessionStorage.setItem("first-frame", `${shown}/${all.length}`);
    };
    requestAnimationFrame(frame);
  });
  await page.goto("/shows/breaking-bad/");
  await finished(page).check();
  await page.locator(".track a").first().click();
  await expect(page).toHaveURL(/better-call-saul/);
  await expect(finished(page)).toBeChecked();
  const now = await cards(page).count();
  expect(now).toBeLessThan(await page.locator(".track li").count());
  expect(await page.evaluate(() => sessionStorage.getItem("first-frame"))).toBe(`${now}/10`);
  await expect(page.locator("#matches-count")).toHaveText(`· ${now} of 10`);
});

test("filter controls have names, a group, and targets of at least 24px", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(page.getByRole("form", { name: "Filter shows" })).toBeVisible();
  await expect(hours(page).getByRole("option")).toHaveText(["Any length", "Under 20 hours", "Under 40 hours", "Under 80 hours"]);
  await expect(hours(page)).toHaveValue("0");
  for (const chip of await page.locator(".f-chip").all()) {
    if (await chip.isVisible()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  }
  // The arrow keys change the hours, as in any select.
  await hours(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(hours(page)).toHaveValue("20");
});

test("filtered and empty rows pass axe and fit 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/shows/breaking-bad/");
  await finished(page).check();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  await hours(page).selectOption("20");
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
  const on = await bg(".f-chip:has(#f-fin)"), off = await bg(".f-pick");
  expect(on).not.toBe(off);
  await expect(page.locator(".f-pick")).toHaveCSS("border-top-style", "solid");
  // An "on" chip keeps its own colours, ring included, so the ring must be a system colour: our yellow vanishes on white.
  await finished(page).blur();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(finished(page)).toBeFocused();
  const chip = page.locator(".f-chip:has(#f-fin)");
  await expect(chip).toHaveCSS("outline-style", "solid");
  await expect(chip).not.toHaveCSS("outline-color", "rgb(255, 211, 107)");
});
