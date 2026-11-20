// Hold-to-peek (#3, decision 0007): holding a match's poster grows it into a card with more about the show.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const card = (page: Page, name: string) => page.locator(".row:not(.further) .track a.card").filter({ hasText: name });
const peek = (page: Page) => page.getByRole("dialog");
const path = (page: Page) => page.getByRole("navigation", { name: "Your path" }).getByRole("listitem");

/** Press and hold the middle of a card's poster with the mouse. */
async function hold(page: Page, name: string) {
  await card(page, name).scrollIntoViewIfNeeded();
  const b = (await card(page, name).locator(".poster").boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
}

/** The same with a finger (Chrome's touch events), moving `moveBy` px sideways while down. */
async function touchHold(page: Page, name: string, moveBy = 0) {
  await card(page, name).scrollIntoViewIfNeeded();
  const b = (await card(page, name).locator(".poster").boundingBox())!;
  const at = (dx: number) => [{ x: b.x + b.width / 2 + dx, y: b.y + b.height / 2 }];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0) });
  for (let dx = 6; dx <= moveBy; dx += 6) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(-dx) });
  await page.waitForTimeout(700);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test("holding a poster peeks at that show, and Escape closes it again", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  const why = await card(page, "The Sopranos").locator(".c-why").textContent();
  await hold(page, "The Sopranos");
  await expect(peek(page)).toBeVisible();
  await expect(peek(page)).toHaveAccessibleName("The Sopranos");
  await expect(peek(page).getByText("Like Breaking Bad")).toBeVisible();
  await expect(peek(page).getByText(why!, { exact: true })).toBeVisible();
  await expect(peek(page).getByRole("list", { name: "Leads to" }).getByRole("link")).toHaveCount(4);
  await expect(peek(page).getByRole("link", { name: "Open" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(peek(page)).toBeHidden();
  await expect(page).toHaveURL(/breaking-bad/);
});

test("tapping the dimmed page or Close closes it", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await hold(page, "The Sopranos");
  await page.mouse.click(4, 4);
  await expect(peek(page)).toBeHidden();
  await hold(page, "The Sopranos");
  await peek(page).getByRole("button", { name: "Close" }).click();
  await expect(peek(page)).toBeHidden();
  await expect(page).toHaveURL(/breaking-bad/);
});

test("Open hops to the show, and the path says so", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await hold(page, "The Sopranos");
  await peek(page).getByRole("link", { name: "Open" }).click();
  await expect(page.locator("h1")).toHaveText("The Sopranos");
  await expect(path(page)).toHaveText(["Breaking Bad", "The Sopranos"]);
});

test("a show it leads to is two hops down, and the path keeps the one in between", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await hold(page, "The Sopranos");
  const lead = peek(page).getByRole("list", { name: "Leads to" }).getByRole("link").first();
  const name = (await lead.textContent())!.trim();
  await lead.click();
  await expect(page.locator("h1")).toHaveText(name);
  await expect(path(page)).toHaveText(["Breaking Bad", "The Sopranos", name]);
});

test("a right-click with a mouse keeps the browser's own menu", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await page.evaluate(() => addEventListener("contextmenu", (e) => ((window as any).blocked = e.defaultPrevented)));
  await card(page, "The Sopranos").click({ button: "right" });
  expect(await page.evaluate(() => (window as any).blocked)).toBe(false);
  await expect(peek(page)).toBeHidden();
});

test("with reduced motion it opens and closes without animating", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shows/breaking-bad/");
  await hold(page, "The Sopranos");
  await expect(peek(page)).toBeVisible();
  // The grow, the backdrop and the poster's flight are its own; the page's CSS already cuts other motion to nothing.
  expect(await peek(page).evaluate((d) => d.getAnimations({ subtree: true }).length)).toBe(0);
  await page.keyboard.press("Escape");
  await expect(peek(page)).toBeHidden();
});

test("an open peek passes axe and fits 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/shows/breaking-bad/");
  await hold(page, "The Sopranos");
  await expect(peek(page)).toBeVisible();
  await page.waitForTimeout(400); // the grow animation, so contrast is checked on the finished card
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  const box = (await peek(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("a finger held on a poster peeks, the lifting finger opens nothing, and the hint goes after", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    await expect(page.getByText("Hold a poster to peek")).toBeVisible();
    // The finger is where the grown card will be; lifting it must not tap what's under it now.
    await touchHold(page, "The Sopranos");
    await expect(peek(page)).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/breaking-bad/);
    await expect(peek(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.getByText("Hold a poster to peek")).toBeHidden();
  });

  test("a finger that moves is scrolling the row, not peeking; a quick tap still hops", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    await touchHold(page, "The Sopranos", 30);
    await expect(peek(page)).toBeHidden();
    await card(page, "The Sopranos").tap();
    await expect(page).toHaveURL(/the-sopranos/);
  });
});
