// The show page's facts: pills for what helps decide, a plain line for the rest.
import { expect, test } from "@playwright/test";

test("the year it began leads the plain line, not a pill", async ({ page }) => {
  await page.goto("/shows/breaking-bad/");
  await expect(page.locator(".facts + p")).toHaveText("2008 · 5 seasons · 62 episodes · English");
  await expect(page.locator(".facts .pill").filter({ hasText: "2008" })).toHaveCount(0);
});
