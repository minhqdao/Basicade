import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/rusrou.bas",
  "utf8",
);
const losingSource = originalSource
  .replace("40 IF RND(0)>.83333 THEN 70", "40 IF .9>.83333 THEN 70")
  .replace("72 PRINT:PRINT:PRINT:PRINT \"...NEXT VICTIM...\":GOTO 20", "72 END");
const winningSource = originalSource
  .replace("25 N=0", "25 N=10")
  .replace("40 IF RND(0)>.83333 THEN 70", "40 IF .5>.83333 THEN 70")
  .replace("90 GOTO 10", "90 END");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  for (const [source, expected, unexpected] of [
    [losingSource, /BANG!!!! YOU'RE DEAD!/, /YOU WIN !!!/],
    [winningSource, /YOU WIN !!!/, /BANG!!!! YOU'RE DEAD!/],
  ]) {
    const output = [];
    await runBasic({
      source,
      stdin: ["1"],
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });
    const transcript = output.join("\n");
    assert.match(transcript, expected, `${interpreter} reaches the expected outcome`);
    assert.doesNotMatch(transcript, unexpected);
    assert.doesNotMatch(transcript, /Syntax error|Error at line/i);
  }
}

console.log("test: 101 Russian Roulette supports both losing and winning outcomes");
