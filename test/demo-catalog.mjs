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
import { catalogManifest } from "../demos/catalog-manifest.js";
import { compileCatalog } from "../demos/catalog-schema.js";
import { runnerCommand, runnerEvent } from "../demos/runner-protocol.js";
import { staticRoutes } from "../demos/routes.js";

const defaultSelection = resolveSelection();
assert.equal(defaultSelection.game.id, DEFAULT_GAME_ID);
assert.equal(defaultSelection.interpreter.id, "bwbasic");
assert.deepEqual(
  [...new Set(Object.values(games).map((game) => game.collection))],
  [
    "Creative Computing Magazine",
    "101 BASIC Computer Games",
    "BASIC Computer Games",
  ],
);

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
assert.equal(games["101-basbal"], undefined);
assert.equal(games["101-qubic"], undefined);
assert.equal(games["bcg-qubit"].title, "Qubit");

const basic101RouteSelection = resolveSelection(
  "?interpreter=retrobasic",
  "/Basicade/101-acey-ducey/",
);
assert.equal(basic101RouteSelection.game.id, "101-aceydu");
assert.equal(basic101RouteSelection.interpreter.id, "retrobasic");

const oregonTrailSelection = resolveSelection("", "/Basicade/oregon-trail/");
assert.equal(oregonTrailSelection.game.id, "oregon-trail");
assert.equal(oregonTrailSelection.interpreter.id, "bwbasic");

const invalidSelection = resolveSelection("?game=missing&interpreter=missing");
assert.equal(invalidSelection.game.id, DEFAULT_GAME_ID);
assert.equal(invalidSelection.interpreter.id, "bwbasic");

const fallbackInterpreterSelection = resolveSelection(
  "?game=bcg-banner&interpreter=retrobasic",
);
assert.equal(fallbackInterpreterSelection.game.id, "bcg-banner");
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
  assert.match(game.route, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(resolveSelection("", `/Basicade/${game.route}/`).game.id, game.id);
}
assert.deepEqual(
  [...staticRoutes].sort(),
  Object.values(games)
    .map((game) => game.route)
    .sort(),
);

for (const collection of catalogManifest.generatedCollections) {
  const expectedSources = collection.files
    .map((file) => `${collection.sourceDirectory}/${file}.bas`)
    .sort();
  const actualSources = Object.values(games)
    .filter((game) => game.collection === collection.collection)
    .map((game) => game.sourcePath)
    .sort();
  assert.deepEqual(
    actualSources,
    expectedSources,
    `${collection.collection} exactly matches its declared source set`,
  );
  for (const source of expectedSources) assert.ok(existsSync(resolve(source)));
}

const duplicateGameManifest = structuredClone(catalogManifest);
duplicateGameManifest.games.push(structuredClone(duplicateGameManifest.games[0]));
assert.throws(() => compileCatalog(duplicateGameManifest), /game IDs must be unique/);

const unknownInterpreterManifest = structuredClone(catalogManifest);
unknownInterpreterManifest.games[0].interpreters = ["missing"];
assert.throws(() => compileCatalog(unknownInterpreterManifest), /unknown interpreter/);

const strayOverrideManifest = structuredClone(catalogManifest);
strayOverrideManifest.generatedCollections[0].titles.missing = "Missing";
assert.throws(() => compileCatalog(strayOverrideManifest), /unlisted file/);

const duplicateRouteManifest = structuredClone(catalogManifest);
duplicateRouteManifest.games[0].route = "bcg-hammurabi";
assert.throws(() => compileCatalog(duplicateRouteManifest), /routes must be unique/);

const protocolBuffer = new SharedArrayBuffer(4);
assert.equal(runnerCommand({ type: "INIT", wasmUrl: "/runner.js" }).type, "INIT");
assert.equal(
  runnerCommand({
    type: "START",
    source: "10 END",
    filename: "test.bas",
    buffer: protocolBuffer,
    keys: protocolBuffer,
  }).type,
  "START",
);
assert.equal(runnerEvent({ type: "STDOUT", text: "READY" }).type, "STDOUT");
assert.equal(runnerEvent({ type: "STARTED" }).type, "STARTED");
assert.throws(() => runnerCommand({ type: "START" }), /source|shared memory/);
assert.throws(() => runnerEvent({ type: "UNKNOWN" }), /Unknown runner event/);

const url = selectionUrl(new URL("https://example.test/Basicade/?ref=readme"), {
  game: games["101-aceydu"],
  interpreter: interpreters.retrobasic,
});
assert.equal(url.pathname, "/Basicade/101-acey-ducey/");
assert.equal(url.search, "?ref=readme&interpreter=retrobasic");

const oregonTrailUrl = selectionUrl(
  new URL("https://example.test/Basicade/?ref=readme"),
  {
    game: games["oregon-trail"],
    interpreter: interpreters.bwbasic,
  },
);
assert.equal(oregonTrailUrl.pathname, "/Basicade/oregon-trail/");
assert.equal(oregonTrailUrl.search, "?ref=readme");

const removedRouteUrl = selectionUrl(
  new URL("http://localhost:5173/101-qubic/"),
  {
    game: games["101-reverse"],
    interpreter: interpreters.retrobasic,
  },
  "/",
);
assert.equal(removedRouteUrl.pathname, "/101-reverse/");
assert.equal(removedRouteUrl.search, "?interpreter=retrobasic");

const deployedRemovedRouteUrl = selectionUrl(
  new URL("https://example.test/Basicade/101-qubic/"),
  {
    game: games["101-reverse"],
    interpreter: interpreters.retrobasic,
  },
  "/Basicade/",
);
assert.equal(deployedRemovedRouteUrl.pathname, "/Basicade/101-reverse/");

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
