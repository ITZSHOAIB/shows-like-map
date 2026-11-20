// Where to watch (#3): the show page links out to JustWatch India's search for the show.
import { expect, test } from "@playwright/test";

test("the show page links to JustWatch India for that show, and says so", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/shows/breaking-bad/");
  const link = page.getByRole("link", { name: "Where to watch on JustWatch" });
  await expect(link).toHaveAttribute("href", "https://www.justwatch.com/in/search?q=Breaking%20Bad");
  const box = (await link.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(24);
  expect(box.x + box.width).toBeLessThanOrEqual(320); // the hero clips, so a link too wide would be cut, not scroll
});
