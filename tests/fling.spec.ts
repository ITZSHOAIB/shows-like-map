// A fast swipe on a row feels native on a phone: it scrolls straight away and carries its own momentum.
import { expect, test, type CDPSession, type Page } from "@playwright/test";

// The document's touchmove listeners that can cancel a swipe, so make every swipe wait on a script.
async function blocking(cdp: CDPSession) {
  const { result } = await cdp.send("Runtime.evaluate", { expression: "document" });
  const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId! });
  return listeners.filter((l) => l.type === "touchmove" && !l.passive).length;
}

const track = (page: Page) => page.locator(".row:not(.further) .track");

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("rows fling freely, with no snapping to cut a fast swipe's momentum short", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    await expect(track(page)).toHaveCSS("scroll-snap-type", "none");
  });

  test("nothing holds up a swipe, except while a peek is held, when the finger drags the peek instead", async ({ page }) => {
    await page.goto("/shows/breaking-bad/");
    const cdp = await page.context().newCDPSession(page);
    expect(await blocking(cdp)).toBe(0);
    const card = page.locator('.row:not(.further) a.card[href$="/the-sopranos/"]');
    await card.scrollIntoViewIfNeeded();
    const b = (await card.locator(".poster").boundingBox())!;
    const at = [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2000 });
    expect(await blocking(cdp)).toBe(1);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => blocking(cdp)).toBe(0);
  });
});

test("with a mouse, rows still snap, so a drag comes to rest on a card", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(track(page)).toHaveCSS("scroll-snap-type", "x mandatory");
});
