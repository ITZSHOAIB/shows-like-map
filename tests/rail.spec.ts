// Rows that scroll sideways (Rail.astro, decision 0013): faded edges where there's more, and a mouse grabs the row.
import { expect, test, type Page } from "@playwright/test";

const rail = (page: Page) => page.locator(".row:not(.further) .rail");
const track = (page: Page) => rail(page).locator(".track");
const scrolled = (page: Page) => track(page).evaluate((t) => t.scrollLeft);

/** Press on the row's first poster, drag `dx` px in `steps` moves, and let go. */
async function drag(page: Page, dx: number, steps = 10) {
  const b = (await track(page).locator(".poster").first().boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps });
  await page.mouse.up();
}

test.describe("with a mouse", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the row follows a drag, and the release opens nothing", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" }); // no fling: it stops by the mouse, on the nearest card
    await page.goto("/shows/breaking-bad/");
    await expect(rail(page)).toHaveAttribute("data-r", "");
    await drag(page, -300);
    await expect.poll(() => scrolled(page)).toBeGreaterThan(150);
    await expect(rail(page)).toHaveAttribute("data-l", "");
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/breaking-bad\/$/);
  });

  test("let go while moving and it flings on past where the mouse stopped", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    await drag(page, -200, 4);
    await expect.poll(() => scrolled(page)).toBeGreaterThan(260);
  });

  test("a click that doesn't move still hops", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    await track(page).locator('a.card[href$="/the-sopranos/"]').click();
    await expect(page).toHaveURL(/the-sopranos/);
  });

  test("a held peek is dragged by the mouse, not the row under it", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    const b = (await track(page).locator(".poster").first().boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height / 2, { steps: 4 });
    await page.mouse.up();
    expect(await scrolled(page)).toBe(0);
  });

  test("the scrubber jumps where it's clicked, and is for the pointer only", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shows/breaking-bad/");
    const bar = rail(page).locator(".rail-scrub");
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("aria-hidden", "true");
    await bar.scrollIntoViewIfNeeded();
    const b = (await bar.boundingBox())!;
    await page.mouse.click(b.x + b.width - 2, b.y + b.height / 2);
    await expect.poll(() => track(page).evaluate((t) => t.scrollWidth - t.clientWidth - t.scrollLeft)).toBeLessThan(8);
    await expect(rail(page)).not.toHaveAttribute("data-r", "");
  });

  test("a filter that hides most of the row takes its edges and scrubber with it", async ({ page }) => {
    await page.goto("/shows/game-of-thrones/");
    await page.locator("#f-fin").check({ force: true });
    await page.locator("#f-h20").check({ force: true });
    await expect(rail(page)).not.toHaveAttribute("data-r", "");
    await expect(rail(page).locator(".rail-scrub")).toBeHidden();
  });
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("a finger swipes, so there's no scrubber", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    await expect(rail(page)).toHaveAttribute("data-r", "");
    await expect(page.locator(".rail-scrub:visible")).toHaveCount(0);
  });
});
