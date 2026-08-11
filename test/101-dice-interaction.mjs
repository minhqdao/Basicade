import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const source = readFileSync(
  "examples/101-basic-computer-games/dice.bas",
  "utf8",
);

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["1", "Y", "1", "NO"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.equal(
    transcript.match(/HOW MANY ROLLS/g)?.length,
    2,
    `${interpreter} starts a second simulation after Y`,
  );
  assert.equal(transcript.match(/TRY AGAIN \(YES OR NO\)/g)?.length, 2);
  assert.doesNotMatch(transcript, /Syntax error|Error at line/i);
}

console.log("test: 101 Dice replays with both interpreters");
