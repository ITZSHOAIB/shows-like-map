// The automated half of the accessibility pass (docs/agents/frontend.md). Contrast of text on the blurred backdrop
// and gradients is still checked by hand: axe can't measure it.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];

// One page per state: linked matches, only unlinked matches (Planet Earth), a white poster, and the 404.
const PAGES = ["/shows/breaking-bad/", "/shows/planet-earth/", "/shows/the-office-2001/", "/missing-page/"];

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

test("a row with no links can still be scrolled by keyboard", async ({ page }) => {
  await page.goto("/shows/planet-earth/");
  await expect(page.locator(".track")).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("list", { name: "Shows like Planet Earth" })).toBeVisible();
});

test("animations stop when reduced motion is on", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shows/breaking-bad/");
  const seconds = await page.locator(".about .summary").evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(seconds).toBeLessThan(0.001);
});
