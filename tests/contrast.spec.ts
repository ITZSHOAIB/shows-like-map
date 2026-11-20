// Contrast of the hero's text against the real pixels behind it: the blurred poster backdrop, the glow and the poster's
// shadow, which axe can't see through. Each element's text (and its border and icon) is hidden, the box is captured, and
// the text colour is compared with every pixel of what was behind it. The posters are the extremes: white, yellow,
// near-black, and a dark one with bright highlights. If one fails to load the backdrop is plain, which only makes
// the check easier, never flaky.
import { expect, test, type Locator } from "@playwright/test";

const SHOWS = ["the-office-2001", "the-simpsons", "better-call-saul", "seinfeld"];
const TEXT = [".trail-label", ".chip span", ".eyebrow", "h1", ".h-text .muted", ".facts li"];

async function lowestContrast(el: Locator) {
  const { color, radius } = await el.evaluate((e) => {
    const cs = getComputedStyle(e);
    // Past a rounded corner is the page, not the element: skip that far in from each side.
    return { color: cs.color, radius: Math.min(parseFloat(cs.borderTopLeftRadius) || 0, e.getBoundingClientRect().height / 2) };
  });
  const hide = (on: boolean) =>
    el.evaluate((e, on) => {
      const s = (e as HTMLElement).style;
      s.color = s.borderColor = on ? "transparent" : "";
      // Text nested in its own colour (the tagline's gold half) is hidden too, and checked as an element of its own.
      e.querySelectorAll<HTMLElement>("*").forEach((c) => (c.style.color = on ? "transparent" : ""));
      e.querySelectorAll("svg").forEach((svg) => (svg.style.visibility = on ? "hidden" : ""));
    }, on);
  await hide(true);
  const png = await el.screenshot({ animations: "disabled" });
  await hide(false);
  return el.page().evaluate(
    async ({ b64, color, radius }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const ctx = new OffscreenCanvas(img.width, img.height).getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const x = Math.max(2, Math.ceil(radius)); // inset past the rounded, anti-aliased edge
      const px = ctx.getImageData(x, 2, img.width - 2 * x, img.height - 4).data;
      const channel = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const lum = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
      const text = lum(r, g, b);
      let lowest = Infinity;
      for (let i = 0; i < px.length; i += 4) {
        const bg = lum(px[i], px[i + 1], px[i + 2]);
        lowest = Math.min(lowest, (Math.max(text, bg) + 0.05) / (Math.min(text, bg) + 0.05));
      }
      return lowest;
    },
    { b64: png.toString("base64"), color, radius },
  );
}

for (const show of SHOWS) {
  test(`hero text keeps 4.5:1 over the backdrop: ${show}`, async ({ page }) => {
    // One show already on the path, so the strip shows too.
    await page.addInitScript(() => sessionStorage.setItem("slm:path", JSON.stringify([{ slug: "x", name: "Previous show", poster: "" }])));
    await page.goto(`/shows/${show}/`);
    await page.waitForLoadState("networkidle");
    const low: string[] = [];
    for (const sel of TEXT) {
      for (const el of await page.locator(sel).all()) {
        const ratio = await lowestContrast(el);
        if (ratio < 4.5) low.push(`${sel} "${(await el.textContent())?.trim()}": ${ratio.toFixed(2)}`);
      }
    }
    expect(low).toEqual([]);
  });
}

test("the home page's tagline keeps 4.5:1 over its posters", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const low: string[] = [];
  for (const sel of [".hero .eyebrow", ".hero h1", ".hero h1 span", ".promise li"]) {
    // The gold half wraps mid-line, so its box takes in white words too: hide those while it's measured.
    await page.locator(".hero h1").evaluate((h, gold) => (h.style.color = gold ? "transparent" : ""), sel === ".hero h1 span");
    for (const el of await page.locator(sel).all()) {
      const ratio = await lowestContrast(el);
      if (ratio < 4.5) low.push(`${sel} "${(await el.textContent())?.trim()}": ${ratio.toFixed(2)}`);
    }
  }
  expect(low).toEqual([]);
});
