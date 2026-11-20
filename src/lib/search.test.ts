import assert from "node:assert/strict";
import { test } from "node:test";
import type { Show } from "./catalogue.ts";
import { entryOf } from "./search-index.ts";
import { norm, prepare, search } from "./search.ts";

const show = (name: string, premiered: string, more: Partial<Show> = {}) =>
  ({ id: 0, slug: norm(name).replace(/ /g, "-"), name, premiered, status: "ended", minutes: 600, poster: null, ...more }) as Show;
// Most popular first, as in the catalogue.
const index = prepare(
  [
    show("Gotham", "2014-09-22"),
    show("Breaking Bad", "2008-01-20"),
    show("The Office", "2005-03-24"),
    show("Game of Thrones", "2011-04-17"),
    show("How I Met Your Mother", "2005-09-19"),
    show("The Office", "2001-07-09", { slug: "the-office-2001" }),
    show("La Casa de Papel", "2017-05-02"),
    show("Pokémon", "1997-04-01"),
  ].map(entryOf),
);
const names = (typed: string) => search(index, typed, 6).map((e) => `${e[1]} ${e[2]}`);

test("a typo still finds the show", () => {
  assert.equal(names("braking bad")[0], "Breaking Bad 2008");
  assert.equal(names("brekaing")[0], "Breaking Bad 2008");
});

test("initials find the show they stand for, ahead of names that start with the letters", () => {
  assert.deepEqual(names("got").slice(0, 2), ["Game of Thrones 2011", "Gotham 2014"]);
  assert.equal(names("himym")[0], "How I Met Your Mother 2005");
});

test("two shows with one name both come up, the more popular first, each with its year", () => {
  assert.deepEqual(names("the office"), ["The Office 2005", "The Office 2001"]);
});

test("a show is found by its English title, and accents don't matter", () => {
  assert.equal(names("money heist")[0], "La Casa de Papel 2017");
  assert.equal(names("pokemon")[0], "Pokémon 1997");
});

test("nothing typed, or nothing like it, finds nothing", () => {
  assert.deepEqual(names("  "), []);
  assert.deepEqual(names("xyzzy"), []);
});

test("an entry carries what a result shows: year, status, hours as the show page writes them, and the poster's path", () => {
  const e = entryOf(show("Dark", "2017-12-01", { minutes: 1450, poster: "https://static.tvmaze.com/uploads/images/medium_portrait/1/2.jpg" }));
  assert.deepEqual(e, ["dark", "Dark", "2017", "ended", "24 h", "1/2.jpg", []]);
});
