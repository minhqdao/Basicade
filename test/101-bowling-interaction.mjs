import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/bowl.bas",
  "utf8",
);
const source = originalSource.replace(
  "3510  REMARK PIN DIAGRAM",
  '3510 PRINT "REACHED PIN DIAGRAM":END',
);
const output = [];

assert.notEqual(source, originalSource, "Bowling roll path was instrumented");

await runBasic({
  source,
  stdin: ["N", "1", "ROLL"],
  onStdout: (line) => output.push(line),
  onStderr: (line) => output.push(line),
});

const transcript = output.join("\n");
assert.match(transcript, /PLAYER 1\s+-- TYPE ROLL/);
assert.match(transcript, /REACHED PIN DIAGRAM/);
assert.doesNotMatch(transcript, /NEXT WITHOUT FOR|Error at line/);

console.log("test: 101 Bowling accepts a single-player roll");
