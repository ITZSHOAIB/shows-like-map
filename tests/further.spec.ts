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
  // A card is a link to its show, reachable by keyboard.
  await cards.first().locator("a").focus();
  await expect(cards.first().locator("a")).toBeFocused();
});

test("holding a card further out peeks at it like a match, saying which match it came via, and Keep there keeps it", async ({ page }) => {
  await filter(page, "game-of-thrones", { finished: true, hours: 20 });
  const first = page.locator(".further li:visible a.card").first();
  const why = (await first.locator(".c-why").textContent())!;
  const via = why.match(/^Via (.+?)[.] /)![1];
  await first.scrollIntoViewIfNeeded();
  const b = (await first.locator(".poster").boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  const peek = page.getByRole("dialog");
  await expect(peek).toBeVisible();
  await expect(peek.getByText(`Via ${via}`, { exact: true })).toBeVisible();
  await expect(peek.locator(".pk-why")).toHaveText(why.slice(`Via ${via}. `.length));
  await peek.getByRole("button", { name: "Keep" }).click();
  await expect(peek).toBeHidden();
  const slug = (await first.getAttribute("href"))!.split("/").filter(Boolean).at(-1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("slm:kept") ?? "[]"))).toEqual([slug]);
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
