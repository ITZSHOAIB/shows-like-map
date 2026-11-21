import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify, toShow, uniqueSlugs } from "./catalogue.ts";

const now = new Date("2026-01-01T00:00:00Z");
const ep = (season: number, runtime: number | null, airstamp: string | null = "2025-01-01T00:00:00Z", type = "regular") => ({
  season,
  runtime,
  airstamp,
  type,
});

test("hours to finish count aired regular episodes, falling back to the average runtime", () => {
  const s = toShow(
    {
      id: 1,
      name: "Show",
      status: "Running",
      averageRuntime: 40,
      url: "https://www.tvmaze.com/shows/1/show",
      _embedded: {
        episodes: [ep(1, 30), ep(1, null), ep(2, 50), ep(2, 60, null), ep(3, 45, "2026-06-01T00:00:00Z"), ep(2, 90, undefined, "significant_special")],
      },
    },
    undefined,
    now,
  );
  assert.equal(s.minutes, 30 + 40 + 50);
  assert.equal(s.episodes, 3);
  assert.equal(s.seasons, 2);
  assert.equal(s.status, "running");
});

test("hours to finish are unknown when TVmaze has no runtimes", () => {
  const s = toShow({ id: 3, name: "Maharani", status: "Ended", url: "u", _embedded: { episodes: [ep(1, null), ep(1, null)] } }, undefined, now);
  assert.equal(s.minutes, null);
});

test("platform prefers the web channel, summary is plain text", () => {
  const s = toShow({
    id: 2,
    name: "Panchayat",
    status: "Ended",
    webChannel: { name: "Prime Video" },
    network: { name: "Some TV" },
    summary: "<p>A <b>village</b> office.</p>",
    url: "u",
  });
  assert.equal(s.platform, "Prime Video");
  assert.equal(s.summary, "A village office.");
  assert.equal(s.status, "ended");
});

test("the rating is TVmaze's average, and unknown when it has none", () => {
  assert.equal(toShow({ id: 5, name: "Dark", status: "Ended", url: "u", rating: { average: 8.7 } }).rating, 8.7);
  assert.equal(toShow({ id: 6, name: "Gullak", status: "Running", url: "u", rating: { average: null } }).rating, null);
});

test("cast is the top billed, creators come from TVmaze crew, else Wikidata", () => {
  const person = (name: string) => ({ person: { name } });
  const raw = {
    id: 4,
    name: "Dark",
    status: "Ended",
    url: "u",
    _embedded: {
      episodes: [],
      cast: ["Louis Hofmann", "Karoline Eichhorn", "Lisa Vicari", "Maja Schöne", "Oliver Masucci", "Jördis Triebel", "Andreas Pietschmann", "Louis Hofmann"].map(person),
      crew: [{ type: "Creator", ...person("Baran bo Odar") }, { type: "Creator", ...person("Jantje Friese") }, { type: "Executive Producer", ...person("Someone") }],
    },
  };
  const wd = { wikidata: "Q27877604", wikipedia: "https://en.wikipedia.org/wiki/Dark_(TV_series)", creators: ["From Wikidata"] };
  const s = toShow(raw, wd);
  assert.deepEqual(s.cast, ["Louis Hofmann", "Karoline Eichhorn", "Lisa Vicari", "Maja Schöne", "Oliver Masucci", "Jördis Triebel"]);
  assert.deepEqual(s.creators, ["Baran bo Odar", "Jantje Friese"]);
  assert.equal(s.wikipedia, wd.wikipedia);
  assert.deepEqual(toShow({ ...raw, _embedded: { ...raw._embedded, crew: [] } }, wd).creators, ["From Wikidata"]);
  assert.equal(toShow(raw).wikidata, null);
});

test("slugs are readable and unique", () => {
  assert.equal(slugify("Money Heist: Korea – Joint Economic Area"), "money-heist-korea-joint-economic-area");
  assert.equal(slugify("Café & Co."), "cafe-and-co");
  const base = { premiered: null } as any;
  const out = uniqueSlugs([
    { ...base, id: 1, slug: "dark", premiered: "2017-12-01" },
    { ...base, id: 2, slug: "dark", premiered: "2005-01-01" },
    { ...base, id: 3, slug: "gullak" },
  ]);
  assert.deepEqual(
    out.map((s) => s.slug),
    ["dark-2017", "dark-2005", "gullak"],
  );
});
