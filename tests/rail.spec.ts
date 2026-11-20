// Rows that scroll sideways (Rail.astro): faded edges where there's more, and arrows for a mouse.
import { expect, test, type Page } from "@playwright/test";

test("a mouse gets an arrow only where there's more, and it pages the row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shows/breaking-bad/");
  const rail = page.locator(".rail").first(), track = rail.locator(".track");
  await expect(rail.locator(".next")).toBeVisible();
  await expect(rail.locator(".prev")).toBeHidden();
  await expect(rail).toHaveAttribute("data-r", "");
  await rail.locator(".next").click();
  await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(400);
  await expect(rail.locator(".prev")).toBeVisible();
  await expect(rail).toHaveAttribute("data-l", "");
  await track.evaluate((t) => (t.scrollLeft = t.scrollWidth));
  await expect(rail.locator(".next")).toBeHidden();
});

test("the arrows are for the pointer only: out of the Tab order and hidden from screen readers", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  for (const b of await page.locator(".rail-btn").all()) {
    await expect(b).toHaveAttribute("tabindex", "-1");
    await expect(b).toHaveAttribute("aria-hidden", "true");
  }
});

test("a filter that hides the row takes its edges with it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shows/game-of-thrones/");
  await page.locator("#f-fin").check({ force: true });
  await page.locator("#f-h20").check({ force: true });
  const rail = page.locator(".row:not(.further) .rail");
  await expect(rail).not.toHaveAttribute("data-r", "");
  await expect(rail.locator(".next")).toBeHidden();
});

test("a phone-sized screen never gets arrows, even with a mouse", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shows/breaking-bad/");
  await expect(page.locator(".rail").first()).toHaveAttribute("data-r", "");
  await expect(page.locator(".rail-btn:visible")).toHaveCount(0);
});

// Paging by whole cards (as streaming apps do): the card cut off at the column's edge leads the next page, so no card is
// ever skipped, and back retraces the same pages. A share of the window skipped cards on wide screens.
test.describe("paging with the arrows", () => {
  /** The cards wholly inside the page column, by index: [first, last]. */
  const inView = (page: Page) => page.locator(".rail").first().locator(".track").evaluate((t) => {
    const pad = parseFloat(getComputedStyle(t).paddingLeft), r = t.getBoundingClientRect();
    const i = [...t.children].flatMap((li, n) => {
      const b = li.getBoundingClientRect();
      return b.left >= r.left + pad - 1 && b.right <= r.right - pad + 1 ? [n] : [];
    });
    return [i[0], i.at(-1)!];
  });
  /** A long row: the matches four times over, so paging doesn't meet the end of the row early. */
  async function longRow(page: Page, width: number) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shows/breaking-bad/");
    await page.locator(".rail").first().locator(".track").evaluate((t) => {
      const cards = [...t.children];
      for (let k = 0; k < 3; k++) for (const li of cards) t.append(li.cloneNode(true));
    });
  }
  const press = (page: Page, arrow: "prev" | "next") => page.locator(".rail").first().locator(`.${arrow}`).click();
  const settled = async (page: Page) => {
    let last = -1;
    await expect.poll(async () => {
      const now = await page.locator(".rail").first().locator(".track").evaluate((t) => t.scrollLeft);
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [150] }).toBe(true);
  };

  for (const width of [1280, 1920]) {
    test(`at ${width}px each page starts with the card after the last one, and back retraces them`, async ({ page }) => {
      await longRow(page, width);
      const pages = [await inView(page)];
      for (let k = 0; k < 3; k++) {
        await press(page, "next");
        await settled(page);
        pages.push(await inView(page));
      }
      for (let k = 1; k < pages.length; k++) expect(pages[k][0]).toBe(pages[k - 1][1] + 1);
      for (let k = pages.length - 2; k >= 0; k--) {
        await press(page, "prev");
        await settled(page);
        expect(await inView(page)).toEqual(pages[k]);
      }
    });
  }

  test("two quick clicks go two pages, not one and a bit", async ({ page }) => {
    await longRow(page, 1920);
    const [, last] = await inView(page);
    const size = last + 1;
    await press(page, "next");
    await press(page, "next");
    await settled(page);
    expect((await inView(page))[0]).toBe(2 * size);
  });
});
