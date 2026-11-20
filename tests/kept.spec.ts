// Kept (#4): keep a show for later, see your list at /kept/, share it, and keep a list someone shared.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const keep = (page: Page) => page.locator("#keep");
const header = (page: Page) => page.locator("#kept-link");
const names = (page: Page) => page.locator("#k-tiles .t-name").allInnerTexts();

test("Keep on a show keeps it across visits, counts it in the header, and a second tap takes it off", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(header(page)).toBeHidden();
  await keep(page).click();
  await expect(keep(page)).toHaveText("Kept");
  await expect(page.locator("#keep-status")).toHaveText(/^Kept\./);
  await expect(header(page)).toBeVisible();
  await expect(header(page)).toHaveText(/Kept\s*1/);
  await page.goto("/");
  await expect(header(page)).toHaveText(/Kept\s*1/);
  await page.goto("/shows/breaking-bad/");
  await expect(keep(page)).toHaveText("Kept");
  await keep(page).click();
  await expect(keep(page)).toHaveText("Keep");
  await expect(header(page)).toBeHidden();
});

test("the list shows kept shows newest first, and Remove takes one off and keeps focus in the list", async ({ page }) => {
  for (const slug of ["fleabag", "dark", "breaking-bad"]) {
    await page.goto(`/shows/${slug}/`);
    await keep(page).click();
  }
  await page.goto("/kept/");
  await expect(page.locator("#k-tiles li")).toHaveCount(3);
  expect(await names(page)).toEqual(["Breaking Bad", "Dark", "Fleabag"]);
  await page.getByRole("button", { name: "Remove Dark" }).click();
  await expect(page.locator("#k-tiles .t-name")).toHaveText(["Breaking Bad", "Fleabag"]); // after the tiles slide
  await expect(page.getByRole("button", { name: "Remove Fleabag" })).toBeFocused();
  await expect(page.locator("#k-note")).toHaveText(/^Removed Dark\./);
  await expect(header(page)).toHaveText(/Kept\s*2/);
});

test("an empty list says how to fill it", async ({ page }) => {
  await page.goto("/kept/");
  await expect(page.locator("#k-empty")).toBeVisible();
  await expect(page.locator("#k-acts")).toBeHidden();
});

test("Share copies a link that opens the same shows, and Keep all keeps them", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permission is Chromium's");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined }));
  for (const slug of ["dark", "breaking-bad"]) {
    await page.goto(`/shows/${slug}/`);
    await keep(page).click();
  }
  await page.goto("/kept/");
  await page.locator("#k-share").click();
  await expect(page.locator("#k-note")).toHaveText(/^Link copied/);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/kept\/\?s=breaking-bad,dark$/);

  // Someone else opens it: their own list is empty.
  await page.evaluate(() => localStorage.clear());
  await page.goto(link + ",no-such-show");
  await expect(page.locator("#k-eyebrow")).toHaveText("Shared with you");
  expect(await names(page)).toEqual(["Breaking Bad", "Dark"]);
  await expect(page.locator(".k-drop")).toHaveCount(0);
  await page.locator("#k-all").click();
  await expect(page).toHaveURL(/\/kept\/$/);
  await expect(page.locator("#k-eyebrow")).toHaveText("Your list");
  expect(await names(page)).toEqual(["Breaking Bad", "Dark"]);
  await expect(header(page)).toHaveText(/Kept\s*2/);
});

test("axe, no sideways scroll at 320px, and forced colours on the list and on a kept show", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/shows/the-office-2001/");
  await keep(page).click();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.goto("/kept/");
  await expect(page.locator("#k-tiles li")).toHaveCount(1);
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/shows/the-office-2001/");
  const on = await keep(page).evaluate((el) => getComputedStyle(el).backgroundColor);
  await keep(page).click();
  expect(await keep(page).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(on);
});

test("the kept page stays out of search", async ({ page }) => {
  await page.goto("/kept/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("on phones the list is three across, like the home page's grid, at every width", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("slm:kept", JSON.stringify(["breaking-bad", "dark", "fleabag", "the-office-2001"])));
  for (const width of [320, 360, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/kept/");
    const tiles = page.locator(".k-tiles > li");
    await expect(tiles).toHaveCount(4);
    const tops = await tiles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops[1]).toBe(tops[0]);
    expect(tops[2]).toBe(tops[0]);
    expect(tops[3]).toBeGreaterThan(tops[0]);
  }
});
