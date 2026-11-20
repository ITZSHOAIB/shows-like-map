// "A step further out" (#3/#4): the shows a show's matches lead to, filling in when a filter leaves the first row thin.
import { expect, test, type Page } from "@playwright/test";

const filter = (page: Page, slug: string, f: { finished: boolean; hours: number }) =>
  page.goto(`/shows/${slug}/`).then(() => page.evaluate((v) => sessionStorage.setItem("slm:filters", JSON.stringify(v)), f)).then(() => page.reload());

test("with no filter on, the page is unchanged: no further-out row", async ({ page }) => {
  await page.goto("/shows/game-of-thrones/");
  await expect(page.locator(".further")).toBeHidden();
});

test("a filter that empties the first row is answered by the row further out, every card passing it", async ({ page }) => {
  await filter(page, "game-of-thrones", { finished: true, hours: 20 });
  await expect(page.locator(".row:not(.further) .track li:visible")).toHaveCount(0);
  await expect(page.locator(".further")).toBeVisible();
  const cards = page.locator(".further li:visible");
  expect(await cards.count()).toBeGreaterThan(0);
  expect(await page.locator(".further li:visible:not([data-fin][data-h20])").count()).toBe(0);
  await expect(cards.first().locator(".c-why")).toContainText(/^Via /);
  // A card is a plain link to its show (no hold-to-peek data for it), reachable by keyboard.
  await cards.first().locator("a").focus();
  await expect(cards.first().locator("a")).toBeFocused();
});

test("when the first row has plenty left, the row further out stays away", async ({ page }) => {
  await filter(page, "breaking-bad", { finished: true, hours: 0 });
  expect(await page.locator(".row:not(.further) .track li:visible").count()).toBeGreaterThanOrEqual(6);
  await expect(page.locator(".further")).toBeHidden();
});

test("choosing a filter on the page brings the row in, and Clear takes it away", async ({ page }) => {
  await page.goto("/shows/game-of-thrones/");
  await page.locator("#f-h20").check({ force: true });
  await page.locator("#f-fin").check({ force: true });
  await expect(page.locator(".further")).toBeVisible();
  await page.locator(".f-clear").click();
  await expect(page.locator(".further")).toBeHidden();
});
