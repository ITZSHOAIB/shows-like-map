import assert from "node:assert/strict";
import { test } from "node:test";
import { key, near, sameShow } from "./resolve.ts";

const show = (name: string) => ({ id: 1, name, year: 2015 });

test("a pick is the same show under TVmaze's fuller or differently written name", async () => {
  assert.ok(await sameShow("Daredevil", show("Marvel's Daredevil")));
  assert.ok(await sameShow("Arcane", show("Arcane: League of Legends")));
  assert.ok(await sameShow("Scarlet Heart: Ryeo", show("Moon Lovers: Scarlet Heart Ryeo")));
  assert.ok(await sameShow("A History of Britain", show("A History of Britain by Simon Schama")));
  assert.ok(await sameShow("Liv and Maddie", show("Liv & Maddie")));
  assert.ok(await sameShow("Heirs", show("The Heirs")));
  assert.ok(await sameShow("Kavanagh QC", show("Kavanagh Q.C.")));
});

test("a spelling variant is near, a longer title is not", () => {
  assert.ok(near(key("Muhteşem Yüzyıl: Kösem"), key("Muhtesem Yüzyil: Kösem")));
  assert.ok(!near(key("Scream"), key("Scream Queens")));
  assert.ok(!near(key("The Chosen"), key("The Chosen Ones")));
});
