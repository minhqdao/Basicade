import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/number.bas",
  "utf8",
);
const source = originalSource
  .replace("15 LET R=INT(5*RND(0))+1", "15 LET R=1")
  .replace("16 LET S=INT(5*RND(0))+1", "16 LET S=2")
  .replace("17 LET T=INT(5*RND(0))+1", "17 LET T=3")
  .replace("18 LET U=INT(5*RND(0))+1", "18 LET U=4")
  .replace("19 LET V=INT(5*RND(0))+1", "19 LET V=5")
  .replace("85 GO TO 11", '85 PRINT "ROUND COMPLETE":END');

assert.notEqual(source, originalSource, "Number outcomes were stabilized");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  for (const [guess, expectedScore] of [
    ["1", 95],
    ["2", 105],
    ["3", 200],
    ["4", 101],
    ["5", 50],
  ]) {
    const output = [];
    await runBasic({
      source,
      stdin: [guess],
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });
    assert.match(
      output.join("\n"),
      new RegExp(`YOU HAVE\\s+${expectedScore}\\s+POINTS`),
      `${interpreter} applies outcome for guess ${guess}`,
    );
  }

  const floorOutput = [];
  await runBasic({
    source: source.replace("8 PRINT:P=100", "8 PRINT:P=3"),
    stdin: ["0", "6", "1"],
    onStdout: (line) => floorOutput.push(line),
    onStderr: (line) => floorOutput.push(line),
  });
  const floorTranscript = floorOutput.join("\n");
  assert.equal(floorTranscript.match(/GUESS A NUMBER FROM 1 TO 5/g)?.length, 3);
  assert.match(floorTranscript, /YOU HAVE 0 POINTS\.\s+YOU LOSE\./);
  assert.doesNotMatch(floorTranscript, /YOU HAVE\s+-/);

  const winOutput = [];
  await runBasic({
    source: source.replace("8 PRINT:P=100", "8 PRINT:P=300"),
    stdin: ["3"],
    onStdout: (line) => winOutput.push(line),
    onStderr: (line) => winOutput.push(line),
  });
  assert.match(winOutput.join("\n"), /!!!!YOU WIN!!!! WITH\s+600\s+POINTS/);
}

console.log("test: 101 Number applies all prizes and handles win/loss endings");
