import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { runBasic } from "../packages/bwbasic-wasm/dist/index.js";

async function runGame(game, input) {
  const output = [];
  const errors = [];

  await runBasic({
    source: await readFile(
      `examples/basic-computer-games/${game}.bas`,
      "utf8",
    ),
    stdin: Array(32).fill(input),
    onStdout: (line) => output.push(line),
    onStderr: (line) => errors.push(line),
  });

  return {
    output: output.join("\n"),
    errors: errors.join("\n"),
  };
}

const animal = await runGame("animal", "YES");
assert.match(animal.output, /IS IT A\s+FISH/i);
assert.match(animal.output, /DOES IT SWIM\?/i);
assert.doesNotMatch(
  animal.output,
  /DOES IT SWIMY2N3/i,
  "Animal hides its encoded yes/no branch targets from the player",
);
assert.doesNotMatch(
  `${animal.output}\n${animal.errors}`,
  /NEXT without FOR|FOR without NEXT/i,
);
assert.equal(animal.errors, "", "Animal has valid Bywater BASIC control flow");

const awari = await runGame("awari", "1");
assert.match(awari.output, /MY MOVE IS/i);
assert.doesNotMatch(
  `${awari.output}\n${awari.errors}`,
  /NEXT without FOR|FOR without NEXT/i,
);
assert.equal(awari.errors, "", "Awari has valid Bywater BASIC control flow");

console.log("test: Animal and Awari run through Bywater BASIC control flow");
