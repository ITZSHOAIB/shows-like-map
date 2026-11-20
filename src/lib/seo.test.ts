import assert from "node:assert/strict";
import { test } from "node:test";
import type { Show } from "./catalogue.ts";
import { DESCRIPTION_MAX, descriptionOf, labelOf, scriptJson, structuredData, titleOf } from "./seo.ts";

const show = (more: Partial<Show> = {}) =>
  ({ name: "The Office", premiered: "2001-07-09", seasons: 2, episodes: 14, genres: ["Comedy"], language: "English", poster: "https://p/x.jpg", tvmaze: "https://www.tvmaze.com/shows/1", wikidata: "Q1", wikipedia: null, ...more }) as Show;

test("a name shared by two shows takes its year, any other stays plain", () => {
  assert.equal(labelOf(show(), true), "The Office (2001)");
  assert.equal(labelOf(show(), false), "The Office");
  assert.equal(titleOf("The Office (2001)"), "Shows like The Office (2001) | Shows Like Map");
});

test("a description leads with the match names and counts the rest", () => {
  const d = descriptionOf("Breaking Bad", ["Better Call Saul", "Ozark", "Narcos", "Dexter", "Fargo", "Mindhunter", "Peaky Blinders", "The Wire", "Sopranos", "Justified"]);
  assert.match(d, /^Shows like Breaking Bad: Better Call Saul, .* and \d+ more, each with why it's similar/);
  assert.ok(d.length <= DESCRIPTION_MAX);
});

test("a description drops names, never the promise, when they don't fit; and never runs over", () => {
  const long = ["A Very Long Title Indeed: The Complete Story", "Another Remarkably Long Title Here", "Third Long Title For The Test"];
  const d = descriptionOf("Some Show With A Rather Long Name Too", long);
  assert.ok(d.length <= DESCRIPTION_MAX);
  assert.match(d, /whether it ended, and hours to finish\.$/);
  assert.equal(descriptionOf("X", []), "Shows like X, each with why it's similar, whether it ended, and hours to finish.");
});

test("structured data has the series and the breadcrumbs, and leaves out what the show lacks", () => {
  const [series, crumbs] = structuredData(show({ poster: null, genres: [] }), "https://s/shows/the-office/", "https://s/") as any[];
  assert.equal(series["@type"], "TVSeries");
  assert.equal(series.datePublished, "2001-07-09");
  assert.deepEqual(series.sameAs, ["https://www.tvmaze.com/shows/1", "https://www.wikidata.org/wiki/Q1"]);
  assert.ok(!("image" in series) && !("genre" in series));
  assert.deepEqual(crumbs.itemListElement.map((i: any) => i.position), [1, 2]);
});

test("text in the data can't end the script tag", () => {
  const json = scriptJson({ name: "</script><b>" });
  assert.ok(!json.includes("<"));
  assert.equal(JSON.parse(json).name, "</script><b>");
});
