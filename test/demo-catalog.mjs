import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_GAME_ID,
  games,
  interpreters,
  resolveSelection,
  selectionUrl,
} from "../demos/catalog.js";

const defaultSelection = resolveSelection();
assert.equal(defaultSelection.game.id, DEFAULT_GAME_ID);
assert.equal(defaultSelection.interpreter.id, "bwbasic");

const requestedSelection = resolveSelection(
  "?game=creative-computing-magazine&interpreter=retrobasic",
);
assert.equal(requestedSelection.game.id, "creative-computing-magazine");
assert.equal(requestedSelection.interpreter.id, "retrobasic");

const basic101Selection = resolveSelection(
  "?game=101-aceydu&interpreter=retrobasic",
);
assert.equal(basic101Selection.game.id, "101-aceydu");
assert.equal(basic101Selection.game.collection, "101 BASIC Computer Games");
assert.equal(basic101Selection.interpreter.id, "retrobasic");

const invalidSelection = resolveSelection("?game=missing&interpreter=missing");
assert.equal(invalidSelection.game.id, DEFAULT_GAME_ID);
assert.equal(invalidSelection.interpreter.id, "bwbasic");

for (const game of Object.values(games)) {
  assert.match(game.sourcePath, /^examples\/[a-z0-9-]+\/.+\.bas$/);
  assert.ok(game.source.url.startsWith("https://"));
  assert.equal(typeof game.source.license, "string");
  for (const interpreterId of game.interpreters) {
    assert.ok(interpreterId in interpreters);
  }
}

const basic101CatalogSources = Object.values(games)
  .filter((game) => game.collection === "101 BASIC Computer Games")
  .map((game) => game.sourcePath.split("/").pop())
  .sort();
assert.equal(basic101CatalogSources.length, 38);
for (const source of basic101CatalogSources) {
  assert.ok(existsSync(resolve("examples/101-basic-computer-games", source)));
}

const url = selectionUrl(new URL("https://example.test/basicade/?ref=readme"), {
  game: games["creative-computing-magazine"],
  interpreter: requestedSelection.interpreter,
});
assert.equal(url.pathname, "/basicade/");
assert.equal(url.search, "?ref=readme&game=creative-computing-magazine&interpreter=retrobasic");

console.log("test: demo catalog URL selection");
