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

// Sideways drag (decision 0012): right keeps the show, left closes the peek; Keep is a button too.
const keptList = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("slm:kept") ?? "[]") as string[]);

test("Keep in the peek keeps the show and says so; on a kept show it takes it off and stays open", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await hold(page, "The Sopranos");
  const keep = peek(page).getByRole("button", { name: "Keep" });
  await expect(keep).toHaveAttribute("aria-pressed", "false");
  await keep.click();
  await expect(peek(page)).toBeHidden();
  expect(await keptList(page)).toEqual(["the-sopranos"]);
  await expect(page.locator("#peek-status")).toHaveText("Kept The Sopranos.");

  await hold(page, "The Sopranos");
  const kept = peek(page).getByRole("button", { name: "Kept" });
  await expect(kept).toHaveAttribute("aria-pressed", "true");
  await kept.click();
  await expect(peek(page)).toBeVisible();
  await expect(peek(page).getByRole("button", { name: "Keep" })).toHaveAttribute("aria-pressed", "false");
  expect(await keptList(page)).toEqual([]);
});

test("nothing in the peek can be selected, so a long press can't take the drag over", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await hold(page, "The Sopranos");
  const select = await peek(page).locator(".pk-why").evaluate((e) => getComputedStyle(e).userSelect || getComputedStyle(e).webkitUserSelect);
  expect(select).toBe("none");
});

test.describe("dragging the peek sideways", () => {
  test.use({ hasTouch: true, isMobile: true });

  /** A finger: down at (x, y), held `waitMs`, then moved by (dx, dy) in steps, and lifted. */
  async function fingerDrag(page: Page, x: number, y: number, dx: number, dy: number, waitMs = 0) {
    const cdp = await page.context().newCDPSession(page);
    const at = (fx: number, fy: number) => [{ x: x + fx, y: y + fy }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0, 0) });
    if (waitMs) await page.waitForTimeout(waitMs);
    for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at((dx * i) / 10, (dy * i) / 10) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  async function posterMiddle(page: Page, name: string) {
    await card(page, name).scrollIntoViewIfNeeded();
    const b = (await card(page, name).locator(".poster").boundingBox())!;
    return [b.x + b.width / 2, b.y + b.height / 2] as const;
  }
  const rowScroll = (page: Page) => page.locator(".row:not(.further) .track").evaluate((t) => t.scrollLeft);

  test("hold and drag right keeps the show, without scrolling the row under it", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    const before = await rowScroll(page);
    const [x, y] = await posterMiddle(page, "The Sopranos");
    await fingerDrag(page, x, y, 140, 0, 600);
    await expect(peek(page)).toBeHidden();
    expect(await keptList(page)).toEqual(["the-sopranos"]);
    expect(await rowScroll(page)).toBe(before);
    await expect(page).toHaveURL(/breaking-bad/);
  });

  test("hold and drag left closes it without keeping", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    const [x, y] = await posterMiddle(page, "The Sopranos");
    await fingerDrag(page, x, y, -140, 0, 600);
    await expect(peek(page)).toBeHidden();
    expect(await keptList(page)).toEqual([]);
  });

  test("let go short of the line and it stays; a fresh sideways drag on it still keeps, an up-down one scrolls", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    const [x, y] = await posterMiddle(page, "The Sopranos");
    await fingerDrag(page, x, y, 30, 0, 600);
    await page.waitForTimeout(600);
    await expect(peek(page)).toBeVisible();
    expect(await peek(page).evaluate((d) => d.style.translate)).toBe("");

    const b = (await peek(page).locator(".pk-why").boundingBox())!;
    await fingerDrag(page, b.x + 40, b.y + b.height / 2, 0, -120);
    await page.waitForTimeout(400);
    await expect(peek(page)).toBeVisible();
    await fingerDrag(page, b.x + 40, b.y + b.height / 2, 150, 8);
    await expect(peek(page)).toBeHidden();
    expect(await keptList(page)).toEqual(["the-sopranos"]);
    await expect(page).toHaveURL(/breaking-bad/);
  });
});
