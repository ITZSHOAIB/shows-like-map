// What search engines and link previews read, checked over the built site in dist/ (all ~2,000 pages, no browser).
// Run `pnpm build` first; the e2e script does.
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { DESCRIPTION_MAX } from "../src/lib/seo";

const DIST = "dist";
const shows = existsSync(DIST) ? readdirSync(`${DIST}/shows`).map((slug) => `shows/${slug}/index.html`) : [];
const pages = existsSync(DIST) ? ["index.html", "about/index.html", ...shows] : [];
const read = (file: string) => readFileSync(`${DIST}/${file}`, "utf8");
const meta = (html: string, attr: string, name: string) =>
  html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
const decode = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

test("the site has pages to check", () => {
  expect(pages.length).toBeGreaterThan(1900);
});

test("every page has a title of its own, and a canonical that matches its og:url", () => {
  const titles = new Map<string, string>();
  const bad: string[] = [];
  for (const file of pages) {
    const html = read(file);
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    if (!title) bad.push(`${file}: no title`);
    else if (titles.has(title)) bad.push(`${file}: title "${title}" also on ${titles.get(title)}`);
    else titles.set(title, file);
    if (!canonical || canonical !== meta(html, "property", "og:url")) bad.push(`${file}: canonical ${canonical} vs og:url`);
    if (decode(meta(html, "property", "og:title") ?? "") !== decode(title ?? "")) bad.push(`${file}: og:title differs from the title`);
  }
  expect(bad).toEqual([]);
});

test("every description fits a search result, and every preview picture is an absolute URL", () => {
  const bad: string[] = [];
  for (const file of pages) {
    const html = read(file);
    const description = decode(meta(html, "name", "description") ?? "");
    if (!description || description.length > DESCRIPTION_MAX) bad.push(`${file}: description of ${description.length} characters`);
    if (decode(meta(html, "property", "og:description") ?? "") !== description) bad.push(`${file}: og:description differs`);
    const image = meta(html, "property", "og:image");
    if (!image || !/^https:\/\//.test(image)) bad.push(`${file}: og:image ${image}`);
  }
  expect(bad).toEqual([]);
});

test("the home page has the large card; a show has its poster on the compact one", () => {
  const home = read("index.html");
  expect(meta(home, "name", "twitter:card")).toBe("summary_large_image");
  expect(meta(home, "property", "og:image")).toBe("https://showslikemap.sohab.dev/og.png");
  const show = read("shows/breaking-bad/index.html");
  expect(meta(show, "name", "twitter:card")).toBe("summary");
  expect(meta(show, "property", "og:image")).toMatch(/^https:\/\/static\.tvmaze\.com\//);
});

test("a show with no poster falls back to the site's own card, on the large layout", () => {
  const html = read("shows/inside/index.html");
  expect(meta(html, "property", "og:image")).toBe("https://showslikemap.sohab.dev/og.png");
  expect(meta(html, "name", "twitter:card")).toBe("summary_large_image");
});

test("a name two shows share carries the year, in the title and the description", () => {
  for (const [file, year] of [["the-office-2001", "2001"], ["the-office-2005", "2005"]]) {
    const html = read(`shows/${file}/index.html`);
    expect(html).toContain(`<title>Shows like The Office (${year}) | Shows Like Map</title>`);
    expect(decode(meta(html, "name", "description")!)).toContain(`Shows like The Office (${year}):`);
  }
});

test("each show's structured data parses, and a title can't break out of its script tag", () => {
  const bad: string[] = [];
  for (const file of shows) {
    const html = read(file);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (blocks.length !== 1) { bad.push(`${file}: ${blocks.length} blocks`); continue; }
    try {
      const [series, crumbs] = JSON.parse(blocks[0]);
      if (series["@type"] !== "TVSeries" || crumbs["@type"] !== "BreadcrumbList") bad.push(`${file}: wrong types`);
      if (!series.url?.startsWith("https://") || crumbs.itemListElement[1].item !== series.url) bad.push(`${file}: urls`);
    } catch (e) {
      bad.push(`${file}: ${e}`);
    }
  }
  expect(bad).toEqual([]);
});

test("the About page says the lists are made with AI, and where to report a problem", () => {
  const html = read("about/index.html");
  expect(html).toContain("written with AI and checked against TVmaze");
  expect(html).toContain("https://github.com/ITZSHOAIB/shows-like-map/issues/new");
  expect(read("index.html")).toContain('href="/about/"');
  expect(read("shows/breaking-bad/index.html")).toContain('href="/about/"');
});

test("the sitemap lists exactly the pages built, each once, and the 404 stays out of it", () => {
  const urls = [...read("sitemap.xml").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  expect(new Set(urls).size).toBe(urls.length);
  expect(urls.length).toBe(pages.length);
  expect(urls.some((u) => u.includes("404"))).toBe(false);
  expect(read("404.html")).toContain('name="robots" content="noindex"');
});
