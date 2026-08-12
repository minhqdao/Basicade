import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/pizza.bas",
  "utf8",
);
const source = originalSource
  .replace("760 S=INT(RND*16+1):PRINT", "760 S=1:PRINT")
  .replace(
    '920 PRINT "HELLO "N$".  THIS IS "S$(S)",  THANKS FOR THE PIZZA."',
    '920 PRINT "DELIVERY COMPLETE":END',
  );

assert.notEqual(source, originalSource, "Pizza delivery was stabilized");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["SAM", "NO", "0,1", "5,1", "1,0", "1,5", "1.5,1", "1,1"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.equal(
    transcript.match(/THOSE COORDINATES DON'T EXIST\.\s+TRY AGAIN\./g)?.length,
    5,
    `${interpreter} rejects every invalid coordinate pair`,
  );
  assert.match(transcript, /DELIVERY COMPLETE/);
  assert.doesNotMatch(
    transcript,
    /Subscript out of range|BAD SUBSCRIPT|Syntax error|Error at line/i,
  );
}

console.log("test: 101 Pizza rejects invalid coordinates and continues");
