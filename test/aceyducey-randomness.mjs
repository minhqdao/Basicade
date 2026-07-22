import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "examples/basic-computer-games/aceyducey.bas",
  "utf8",
);

assert.doesNotMatch(
  source,
  /^\d+ RANDOMIZE(?:\s|$)/m,
  "Acey-Ducey relies on the interpreter's default run seed",
);

function openingCards(lines) {
  const cards = lines.filter((line) =>
    /^\s*(?:[2-9]|10|JACK|QUEEN|KING|ACE)\s*$/.test(line),
  );
  return cards.slice(0, 2).join(",");
}

const { runBasic } = await import("../packages/bwbasic-wasm/dist/index.js");
const deals = new Set();

for (let attempt = 0; attempt < 8; attempt += 1) {
  const output = [];

  await runBasic({
    source,
    stdin: [],
    onStdout: (line) => output.push(line),
    onStderr: () => {},
  });

  const deal = openingCards(output);
  assert.match(deal, /.+,.+/, "Bywater BASIC prints an opening deal");
  deals.add(deal);
}

assert.ok(
  deals.size > 1,
  "Bywater BASIC automatically varies unseeded opening deals",
);

console.log("test: Bywater BASIC auto-seeds unseeded Acey-Ducey runs");
