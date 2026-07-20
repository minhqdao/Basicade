import assert from "node:assert/strict";
import {
  DEFAULT_GAME_ID,
  games,
  resolveSelection,
  selectionUrl,
} from "../demos/catalog.js";

const defaultSelection = resolveSelection();
assert.equal(defaultSelection.game.id, DEFAULT_GAME_ID);
assert.equal(defaultSelection.interpreter.id, "bwbasic");

const requestedSelection = resolveSelection(
  "?game=oregon-trail&interpreter=retrobasic",
);
assert.equal(requestedSelection.game.id, "oregon-trail");
assert.equal(requestedSelection.interpreter.id, "retrobasic");

const invalidSelection = resolveSelection("?game=missing&interpreter=missing");
assert.equal(invalidSelection.game.id, DEFAULT_GAME_ID);
assert.equal(invalidSelection.interpreter.id, "bwbasic");

const url = selectionUrl(new URL("https://example.test/basicade/?ref=readme"), {
  game: games["oregon-trail"],
  interpreter: requestedSelection.interpreter,
});
assert.equal(url.pathname, "/basicade/");
assert.equal(url.search, "?ref=readme&game=oregon-trail&interpreter=retrobasic");

console.log("test: demo catalog URL selection");
