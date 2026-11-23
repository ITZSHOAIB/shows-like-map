// The automated half of the accessibility pass (docs/agents/frontend.md). Contrast of text on the blurred backdrop
// and gradients is still checked by hand: axe can't measure it.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];

// One page per state: the home page, the About page, linked matches, only unlinked matches (Planet Earth), a white poster, and the 404.
const PAGES = ["/", "/about/", "/shows/breaking-bad/", "/shows/planet-earth/", "/shows/the-office-2001/", "/missing-page/"];

async function openSummary(page: Page) {
  const toggle = page.locator(".about summary");
  if ((await toggle.count()) > 0) await toggle.click();
}

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  });

  test(`axe with the summary open: ${path}`, async ({ page }) => {
    await page.goto(path);
    await openSummary(page);
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  });

  test(`no sideways scroll at 320px: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await openSummary(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}

test("the summary toggle has a short name, a 24px target, and opens by keyboard", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  const toggle = page.locator(".about summary");
  await expect(toggle).toHaveAccessibleName("More about Breaking Bad");
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(24);

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".about details")).toHaveAttribute("open", "");
  await expect(toggle).toHaveAccessibleName("Less about Breaking Bad");
});

test("keyboard focus is visible, and on a card it rings the poster", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".brand")).toBeFocused();
  await expect(page.locator(".brand")).toHaveCSS("outline-style", "solid");

  const card = page.locator(".track a").first();
  await card.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab"); // focus from the keyboard, so :focus-visible applies
  await expect(card).toBeFocused();
  await expect(card.locator(".poster")).toHaveCSS("outline-style", "solid");
});

test("a match without a page here links to TVmaze, says so, and is reached by keyboard", async ({ page }) => {
  await page.goto("/shows/planet-earth/");
  const card = page.locator(".track a.card.out").first();
  expect(await card.getAttribute("href")).toMatch(new RegExp("^https://www[.]tvmaze[.]com/shows/[0-9]+$"));
  await expect(card.locator(".c-meta")).toContainText("On TVmaze");
  await page.keyboard.press("Tab");
  for (let i = 0; i < 30 && !(await card.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(card).toBeFocused();
  await expect(card.locator(".poster-ph")).toHaveCSS("outline-style", "solid");
});

test("animations stop when reduced motion is on", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shows/breaking-bad/");
  const seconds = await page.locator(".about .summary").evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(seconds).toBeLessThan(0.001);
});

test("the site stays dark when the phone is set to light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/shows/breaking-bad/");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(7, 8, 12)");
});

// Windows High Contrast and other forced-colour modes replace our colours with the system's: what carries meaning
// must survive as text, borders and outlines, since backgrounds and shadows are dropped. axe doesn't model forced
// colours (it reports our own colours on white), so this checks the result directly.
test("forced colours keep focus rings, badges and path chips visible", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/shows/breaking-bad/");
  await page.locator(".track a").first().click();
  await expect(page.getByRole("navigation", { name: "Your path" })).toBeVisible();
  await expect(page.locator(".backdrop")).toBeHidden();
  const canvas = await page.locator("body").evaluate((b) => getComputedStyle(b).color);
  await expect(page.locator("h1")).toHaveCSS("color", canvas);

  for (const el of [page.locator(".facts .badge"), page.locator(".trail .chip").first()]) {
    await expect(el).toHaveCSS("border-top-style", "solid");
    await expect(el).not.toHaveCSS("border-top-width", "0px");
  }
  const card = page.locator(".track a").first();
  await card.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(card.locator(".poster")).toHaveCSS("outline-style", "solid");
});

test("axe and no sideways scroll at 320px on the home page, with a time chosen and search results showing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.locator("#time .f-chip", { hasText: "40 h" }).click();
  await page.locator("#q").fill("the office");
  await expect(page.locator("#results .tile").first()).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("axe and no sideways scroll at 320px with a filter on and the row further out showing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/shows/game-of-thrones/");
  await page.evaluate(() => sessionStorage.setItem("slm:filters", JSON.stringify({ finished: true, hours: 20 })));
  await page.reload();
  await expect(page.locator(".further")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

// The payoff skyline: tested once it has risen, since axe skips what's still hidden for the arrival.
test.describe("the payoff skyline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    test.skip((await page.locator(".sky").count()) === 0, "the catalogue predates runs: run the data job");
  });

  test("passes axe with a season picked, and fits 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.locator(".sky").scrollIntoViewIfNeeded();
    await expect(page.locator(".sky.done")).toHaveCount(1, { timeout: 5000 });
    await page.locator(".sky-spots button").nth(1).click();
    expect((await new AxeBuilder({ page }).include(".sky").withTags(TAGS).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  test("seasons are reached by keyboard, show focus, and say themselves", async ({ page }) => {
    const first = page.locator(".sky-spots button").first();
    await first.focus();
    await expect(first).toHaveCSS("outline-style", "solid");
    await expect(page.locator(".sky-say b")).toContainText("Season 1 ·");
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-pressed", "true");
  });

  test("risen at once when reduced motion is on", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect(page.locator(".sky")).toHaveClass(/\bdone\b/);
  });

  test("in forced colours the picked season keeps a visible focus ring", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.reload();
    const first = page.locator(".sky-spots button").first();
    await first.focus();
    await expect(first).toHaveCSS("outline-style", "solid");
    await expect(page.locator(".sky-verdict")).toBeVisible();
  });
});
