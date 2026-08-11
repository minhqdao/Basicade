import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const source = readFileSync(
  "examples/101-basic-computer-games/litqz.bas",
  "utf8",
);
const outcomes = [
  [["3", "2", "4", "3"], /WOW!\s+THAT'S SUPER!/],
  [["3", "2", "1", "1"], /NOT BAD, BUT/],
  [["1", "1", "1", "1"], /UGH\.\s+THAT WAS DEFINITELY NOT TOO SWIFT/],
];

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  for (const [stdin, expectedOutcome] of outcomes) {
    const output = [];

    await runBasic({
      source,
      stdin,
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });

    const transcript = output.join("\n");
    assert.match(transcript, expectedOutcome, `${interpreter} prints the result`);
    assert.doesNotMatch(
      transcript,
      /STOPped at line|Syntax error|Error at line/i,
      `${interpreter} exits the result normally`,
    );
  }
}

console.log("test: 101 Literature Quiz ends cleanly for every score range");
