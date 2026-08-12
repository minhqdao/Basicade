import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { runBasic } from "../packages/bwbasic-wasm/dist/index.js";

const output = [];
const errors = [];

await runBasic({
  source: await readFile(
    "examples/basic-computer-games/awari.bas",
    "utf8",
  ),
  stdin: Array(32).fill("1"),
  onStdout: (line) => output.push(line),
  onStderr: (line) => errors.push(line),
});

const transcript = output.join("\n");
const diagnostics = errors.join("\n");

assert.match(transcript, /MY MOVE IS/i);
assert.doesNotMatch(
  `${transcript}\n${diagnostics}`,
  /NEXT without FOR|FOR without NEXT/i,
);
assert.equal(diagnostics, "", "Awari has valid Bywater BASIC control flow");

console.log("test: BCG Awari runs through Bywater BASIC control flow");
