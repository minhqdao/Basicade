import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/even.bas",
  "utf8",
);
const source = originalSource
  .replace(
    "310 IF T=0 THEN 880",
    '310 PRINT "COMPUTER START COMPLETE":END',
  )
  .replace("1140 INPUT Y", '1140 PRINT "PLAYER START COMPLETE":END');

assert.notEqual(source, originalSource, "Even Wins start paths were instrumented");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  for (const [firstPlayer, completionMarker] of [
    ["0", "COMPUTER START COMPLETE"],
    ["1", "PLAYER START COMPLETE"],
  ]) {
    const output = [];

    await runBasic({
      source,
      stdin: [firstPlayer],
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });

    const transcript = output.join("\n");
    assert.match(
      transcript,
      /TOTAL\s*=\s*27/,
      `${interpreter} starts with 27 marbles when player ${firstPlayer} starts`,
    );
    assert.match(transcript, new RegExp(completionMarker));
    assert.doesNotMatch(transcript, /Syntax error|Error at line/i);
  }
}

console.log("test: 101 Even Wins starts with 27 marbles in both turn orders");
