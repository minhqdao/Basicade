import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/gomoko.bas",
  "utf8",
);
const source = originalSource.replace(
  "610 LET X=INT(N*RND(0))+1\\LET Y=INT(RND(0)*N)+1\\GOSUB 910\\IF L=0 THEN 610",
  "610 LET X=N\\LET Y=N\\GOSUB 910\\IF L=0 THEN 610",
);

assert.notEqual(source, originalSource, "Gomoko computer move was stabilized");

const output = [];
await runRetroBasic({
  source,
  stdin: [
    "7",
    "1,1",
    "-1,-1",
    "1",
    "7",
    "1,1",
    "-1,-1",
    "0",
  ],
  onStdout: (line) => output.push(line),
  onStderr: (line) => output.push(line),
});

const transcript = output.join("\n");
assert.doesNotMatch(transcript, /SQUARE OCCUPIED|ILLEGAL MOVE/);
assert.match(
  transcript,
  /1\s+0\s+0\s+0\s+0\s+0\s+0[\s\S]*0\s+0\s+0\s+0\s+0\s+0\s+2/,
  "the printed board contains the opening player and computer moves",
);
assert.equal(transcript.match(/WHAT IS YOUR BOARD SIZE/g)?.length, 2);
assert.equal(transcript.match(/YOUR PLAY \(I,J\)/g)?.length, 4);
assert.equal(transcript.match(/THANKS FOR THE GAME/g)?.length, 2);
assert.doesNotMatch(
  transcript,
  /BAD SUBSCRIPT|RETURN WITHOUT GOSUB|Syntax error|Error at line/i,
);

console.log("test: 101 Gomoko accepts an opening, restarts cleanly, and exits");
