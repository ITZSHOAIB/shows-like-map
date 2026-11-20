// Rows that scroll sideways (Rail.astro): faded edges where there's more, and arrows for a mouse.
import { expect, test } from "@playwright/test";

test("a mouse gets an arrow only where there's more, and it pages the row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shows/breaking-bad/");
  const rail = page.locator(".rail").first(), track = rail.locator(".track");
  await expect(rail.locator(".next")).toBeVisible();
  await expect(rail.locator(".prev")).toBeHidden();
  await expect(rail).toHaveAttribute("data-r", "");
  await rail.locator(".next").click();
  await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(400);
  await expect(rail.locator(".prev")).toBeVisible();
  await expect(rail).toHaveAttribute("data-l", "");
  await track.evaluate((t) => (t.scrollLeft = t.scrollWidth));
  await expect(rail.locator(".next")).toBeHidden();
});

test("the arrows are for the pointer only: out of the Tab order and hidden from screen readers", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  for (const b of await page.locator(".rail-btn").all()) {
    await expect(b).toHaveAttribute("tabindex", "-1");
    await expect(b).toHaveAttribute("aria-hidden", "true");
  }
});

test("a filter that hides the row takes its edges with it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shows/game-of-thrones/");
  await page.locator("#f-fin").check({ force: true });
  await page.locator("#f-h20").check({ force: true });
  const rail = page.locator(".row:not(.further) .rail");
  await expect(rail).not.toHaveAttribute("data-r", "");
  await expect(rail.locator(".next")).toBeHidden();
});

test("a phone-sized screen never gets arrows, even with a mouse", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shows/breaking-bad/");
  await expect(page.locator(".rail").first()).toHaveAttribute("data-r", "");
  await expect(page.locator(".rail-btn:visible")).toHaveCount(0);
});
