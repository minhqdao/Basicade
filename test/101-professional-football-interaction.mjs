import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/footbl.bas",
  "utf8",
);
const source = originalSource.replace(
  "630 GOSUB 2250",
  '630 PRINT "RECEIVE CHOICE ACCEPTED";S:END',
);

assert.notEqual(
  source,
  originalSource,
  "Professional Football receive path was instrumented",
);

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  for (const [receive, expectedSide] of [
    ["0", "1"],
    ["1", "2"],
  ]) {
    const output = [];

    await runBasic({
      source,
      stdin: ["0", receive],
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });

    const transcript = output.join("\n");
    assert.match(
      transcript,
      /DO YOU WANT TO RECEIVE \(0 FOR NO, 1 FOR YES\)/,
    );
    assert.match(
      transcript,
      new RegExp(`RECEIVE CHOICE ACCEPTED\\s+${expectedSide}`),
      `${interpreter} accepts receive choice ${receive}`,
    );
    assert.doesNotMatch(transcript, /WRONG, TRY AGAIN|Syntax error|Error at line/i);
  }
}

console.log("test: 101 Professional Football accepts both receive choices");
