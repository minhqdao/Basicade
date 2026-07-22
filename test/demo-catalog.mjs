import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  "?game=oregon-trail&interpreter=retrobasic",
);
assert.equal(requestedSelection.game.id, "oregon-trail");
assert.equal(requestedSelection.interpreter.id, "retrobasic");

const basic101Selection = resolveSelection(
  "?game=101-aceydu&interpreter=retrobasic",
);
assert.equal(basic101Selection.game.id, "101-aceydu");
assert.equal(basic101Selection.game.collection, "101 BASIC Computer Games");
assert.equal(basic101Selection.interpreter.id, "retrobasic");

const oregonTrailSelection = resolveSelection("", "/Basicade/oregon-trail/");
assert.equal(oregonTrailSelection.game.id, "oregon-trail");
assert.equal(oregonTrailSelection.interpreter.id, "bwbasic");

const invalidSelection = resolveSelection("?game=missing&interpreter=missing");
assert.equal(invalidSelection.game.id, DEFAULT_GAME_ID);
assert.equal(invalidSelection.interpreter.id, "bwbasic");

const fallbackInterpreterSelection = resolveSelection(
  "?game=bcg-bagels&interpreter=retrobasic",
);
assert.equal(fallbackInterpreterSelection.game.id, "bcg-bagels");
assert.equal(fallbackInterpreterSelection.interpreter.id, "bwbasic");

for (const game of Object.values(games)) {
  const selection = resolveSelection(
    `?game=${encodeURIComponent(game.id)}&interpreter=retrobasic`,
  );
  assert.equal(selection.game.id, game.id, `${game.id} remains selectable`);
  assert.ok(
    game.interpreters.includes(selection.interpreter.id),
    `${game.id} resolves to a compatible interpreter`,
  );
}

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

const basicComputerGamesCatalogSources = Object.values(games)
  .filter((game) => game.collection === "BASIC Computer Games")
  .map((game) => game.sourcePath.split("/").pop())
  .sort();
assert.equal(basicComputerGamesCatalogSources.length, 103);
for (const source of basicComputerGamesCatalogSources) {
  assert.ok(existsSync(resolve("examples/basic-computer-games", source)));
}

const url = selectionUrl(new URL("https://example.test/Basicade/?ref=readme"), {
  game: games["101-aceydu"],
  interpreter: interpreters.retrobasic,
});
assert.equal(url.pathname, "/Basicade/");
assert.equal(url.search, "?ref=readme&game=101-aceydu&interpreter=retrobasic");

const oregonTrailUrl = selectionUrl(
  new URL("https://example.test/Basicade/?ref=readme"),
  {
    game: games["oregon-trail"],
    interpreter: interpreters.bwbasic,
  },
);
assert.equal(oregonTrailUrl.pathname, "/Basicade/oregon-trail/");
assert.equal(oregonTrailUrl.search, "?ref=readme");

const launcherMarkup = readFileSync("index.html", "utf8");
const launcherScript = readFileSync("demos/launcher.js", "utf8");
assert.match(launcherMarkup, /id="terminal-input"/);
assert.match(
  launcherMarkup,
  /<pre[\s\S]*id="terminal"[\s\S]*<input\s+id="terminal-input"/,
  "the native input follows the rendered terminal content",
);
assert.match(
  launcherMarkup,
  /@media \(max-width: 560px\)[\s\S]*#terminal-input\s*{[^}]*position: static;/,
  "mobile places the focused input at the active terminal line",
);
assert.match(
  launcherMarkup,
  /@media \(max-width: 560px\)[\s\S]*#terminal-input\s*{[^}]*width: 100%;/,
  "mobile preserves enough native input width for reliable caret tracking",
);
assert.match(
  launcherMarkup,
  /@media \(max-width: 560px\)[\s\S]*#terminal-container\s*{[^}]*flex: 1 1 auto;[^}]*min-height: 240px;/,
  "the portrait terminal fills available space while retaining a minimum",
);
assert.match(launcherScript, /terminalInput\.addEventListener\("input"/);
assert.doesNotMatch(
  launcherScript,
  /terminalInput\.value\s*=\s*currentInput/,
  "display uppercasing never rewrites the native mobile input",
);
assert.match(
  launcherScript,
  /terminalContainer\.addEventListener\("pointerdown", handleTerminalPointerDown\)/,
);
assert.match(
  launcherScript,
  /terminalContainer\.addEventListener\("click", handleTerminalClick\)/,
);

console.log("test: demo catalog URL selection");
