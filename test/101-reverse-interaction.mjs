import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/reverse.bas",
  "utf8",
);
const source = originalSource.replace(
  "460 GOSUB 610",
  '460 PRINT "VALID MOVE ACCEPTED":END',
);

assert.notEqual(source, originalSource, "Reverse move path was instrumented");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["NO", "0", "2"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.equal(
    transcript.match(/HOW MANY SHALL I REVERSE/g)?.length,
    2,
    `${interpreter} repeats the prompt after zero`,
  );
  assert.match(transcript, /VALID MOVE ACCEPTED/);
  assert.doesNotMatch(
    transcript,
    /Undefined target|UNDEFINED STATEMENT|Syntax error|Error at line/i,
  );
}

console.log("test: 101 Reverse ignores zero and accepts the next move");
