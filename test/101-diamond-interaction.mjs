import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic } from "../packages/retrobasic-wasm/dist/index.js";

const output = [];
const errors = [];

await runBasic({
  source: readFileSync(
    "examples/101-basic-computer-games/diamnd.bas",
    "utf8",
  ),
  stdin: ["5"],
  onStdout: (line) => output.push(line),
  onStderr: (line) => errors.push(line),
});

const transcript = output.join("\n");
assert.match(transcript, /D\s+D\s+D/);
assert.match(transcript, /DEC\s+DEC\s+DEC/);
assert.match(transcript, /(?:DEC!!){3}/);
assert.equal(errors.length, 0, errors.join("\n"));

console.log("test: 101 Diamond prints complete visible diamonds");
