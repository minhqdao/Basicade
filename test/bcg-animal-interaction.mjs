import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { runBasic } from "../packages/bwbasic-wasm/dist/index.js";

const output = [];
const errors = [];

await runBasic({
  source: await readFile(
    "examples/basic-computer-games/animal.bas",
    "utf8",
  ),
  stdin: Array(32).fill("YES"),
  onStdout: (line) => output.push(line),
  onStderr: (line) => errors.push(line),
});

const transcript = output.join("\n");
const diagnostics = errors.join("\n");

assert.match(transcript, /IS IT A\s+FISH/i);
assert.match(transcript, /DOES IT SWIM\?/i);
assert.doesNotMatch(
  transcript,
  /DOES IT SWIMY2N3/i,
  "Animal hides its encoded yes/no branch targets from the player",
);
assert.doesNotMatch(
  `${transcript}\n${diagnostics}`,
  /NEXT without FOR|FOR without NEXT/i,
);
assert.equal(diagnostics, "", "Animal has valid Bywater BASIC control flow");

console.log("test: BCG Animal runs through Bywater BASIC control flow");
