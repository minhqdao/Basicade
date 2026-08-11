import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/chomp.bas",
  "utf8",
);
const source = originalSource
  .replace(
    '820 PRINT "PLAYER ";P1',
    '820 T=T+1:IF T=2 THEN 1070 ELSE PRINT "PLAYER ";P1',
  )
  .concat('\n1070 PRINT "REACHED SECOND TURN":END\n');

assert.notEqual(source, originalSource, "Chomp turn path was instrumented");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["0", "1", "3", "3", "2,2"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(
    transcript,
    /REACHED SECOND TURN/,
    `${interpreter} reaches the next turn after a legal chomp`,
  );
  assert.doesNotMatch(transcript, /NEXT WITHOUT FOR|mismatched FOR/i);
}

console.log("test: 101 Chomp reaches the next turn with both interpreters");
