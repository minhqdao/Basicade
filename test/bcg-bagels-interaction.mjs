import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = await readFile(
  "examples/basic-computer-games/bagels.bas",
  "utf8",
);
const source = originalSource
  .replace(
    '210 PRINT:PRINT "O.K.  I HAVE A NUMBER IN MIND."',
    '210 G=G+1:PRINT:PRINT "O.K.  I HAVE A NUMBER IN MIND.":IF G=2 THEN 760',
  )
  .replace(
    "240 INPUT A$",
    "240 A$=CHR$(A(1)+48)+CHR$(A(2)+48)+CHR$(A(3)+48)",
  )
  .replace("999 END", '760 PRINT "REACHED SECOND GAME"\n999 END');

assert.notEqual(source, originalSource, "Bagels replay path was instrumented");

const output = [];
const errors = [];
await runBywaterBasic({
  source,
  stdin: ["NO", "YES"],
  onStdout: (line) => output.push(line),
  onStderr: (line) => errors.push(line),
});

const transcript = output.join("\n");
assert.match(transcript, /YOU GOT IT!!!/);
assert.match(transcript, /PLAY AGAIN \(YES OR NO\)/);
assert.equal(
  transcript.match(/O\.K\.  I HAVE A NUMBER IN MIND\./g)?.length,
  2,
  "answering YES starts a second game",
);
assert.match(transcript, /REACHED SECOND GAME/);
assert.equal(errors.join("\n"), "", "Bagels reports no Bywater BASIC errors");

const zeroSecretSource = originalSource.replace(
  "150 FOR I=1 TO 3",
  "150 A(1)=0:A(2)=1:A(3)=2:GOTO 210\n151 FOR I=1 TO 3",
);
assert.notEqual(
  zeroSecretSource,
  originalSource,
  "Bagels zero-containing secret was instrumented",
);

for (const [name, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const zeroOutput = [];
  const zeroErrors = [];
  await runBasic({
    source: zeroSecretSource,
    stdin: ["NO", "012", "NO"],
    onStdout: (line) => zeroOutput.push(line),
    onStderr: (line) => zeroErrors.push(line),
  });
  process.exitCode = undefined;

  assert.match(
    zeroOutput.join("\n"),
    /GUESS #\s*1[\s\S]*YOU GOT IT!!!/,
    `${name} accepts zero as a digit`,
  );
  assert.equal(zeroErrors.join("\n"), "", `${name} reports no zero errors`);
}

console.log("test: BCG Bagels replays and accepts zero with both interpreters");
