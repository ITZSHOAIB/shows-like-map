// Going deeper (#3): the "Your path" strip, and the time from a tap to the next page on a slowed-down phone.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const path = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Your path" });

test("the path grows going deeper and trims going back", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(path(page)).toBeHidden();

  await page.locator(".track a").first().click();
  await expect(page).toHaveURL(/better-call-saul/);
  const second = page.locator(".track a").filter({ hasNotText: "Breaking Bad" }).first(); // not back along the path
  const next = await second.locator(".c-title").textContent();
  await second.click();
  await expect(page.locator("h1")).toHaveText(next!);

  const items = path(page).getByRole("listitem");
  await expect(items).toHaveCount(3);
  await expect(items.last()).toHaveText(next!);
  await expect(path(page).locator("[aria-current=page]")).toHaveText(next!);

  // Stepping back along the path drops the shows after it.
  await path(page).getByRole("link", { name: "Breaking Bad" }).click();
  await expect(page.locator("h1")).toHaveText("Breaking Bad");
  await expect(path(page)).toBeHidden();
  await page.locator(".track a").first().click();
  await expect(path(page).getByRole("listitem")).toHaveCount(2);
});

test("a page with the path passes axe and fits 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/shows/breaking-bad/");
  await page.locator(".track a").first().click();
  await expect(path(page)).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

// Decision 0005: a tap shows the next page in under 300 ms on a mid-range Android phone. What makes that possible is
// checked on every run: the page comes from the prefetch started on touch, and the shared CSS, JS and font from cache.
// The time itself depends on the machine, so it's reported, not asserted, unless BUDGET=1 (on a phone-like CPU).
// Approximated with a 4x slower CPU and Lighthouse's mobile network (150 ms round trips, 1.6 Mbps, applied by
// scripts/serve.ts), with the finger down for 100 ms as in a real tap. Posters come from TVmaze and don't hold it up.
test("a tap shows the next page from the prefetch, in under 300 ms", async ({ page, browserName, baseURL }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "dark", "measured once, in Chromium");
  await page.context().addCookies([{ name: "net", value: `${process.env.RTT ?? 150},1600`, url: baseURL! }]);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.CPU ?? 4) });
  // Times are taken in the page: finger down, finger up (the click), and the next page about to render.
  await page.addInitScript(() => {
    const now = () => String(performance.timeOrigin + performance.now());
    addEventListener("pointerdown", () => sessionStorage.setItem("down", now()), true);
    addEventListener("click", () => sessionStorage.setItem("up", now()), true);
    addEventListener("pagereveal", () => sessionStorage.setItem("revealed", now()));
  });

  const fromDown: number[] = [], fromUp: number[] = [];
  for (let i = 0; i < 5; i++) {
    await page.goto("/shows/breaking-bad/");
    await page.waitForLoadState("networkidle");
    const box = (await page.locator(".track a").first().boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect(page).toHaveURL(/better-call-saul/);
    await expect(page.locator("h1")).toHaveText("Better Call Saul");

    const t = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming & { deliveryType: string };
      const assets = performance.getEntriesByType("resource").filter((r) => r.name.includes("/_astro/")) as PerformanceResourceTiming[];
      const get = (k: string) => Number(sessionStorage.getItem(k));
      return { delivery: nav.deliveryType, downloaded: assets.filter((r) => r.transferSize > 0).map((r) => r.name), assets: assets.length,
        down: get("revealed") - get("down"), up: get("revealed") - get("up") };
    });
    expect(t.delivery).toBe("navigational-prefetch");
    expect(t.assets).toBeGreaterThan(0);
    expect(t.downloaded).toEqual([]);
    fromDown.push(t.down);
    fromUp.push(t.up);
  }

  const median = (xs: number[]) => Math.round(xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]);
  const report = `median of 5: ${median(fromDown)} ms from finger down, ${median(fromUp)} ms from finger up`;
  info.annotations.push({ type: "tap to next page", description: report });
  console.log(`tap to next page, ${report}`);
  if (process.env.BUDGET) expect(median(fromDown)).toBeLessThan(300);
});
