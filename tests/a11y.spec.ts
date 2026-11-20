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
