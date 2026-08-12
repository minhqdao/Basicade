import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/trap.bas",
  "utf8",
);
const trappedSource = originalSource
  .replace("180  X=INT(N*RND(0))+1", "180 X=100")
  .replace("440  GOTO 180", '440 PRINT "ROUND RESTARTED":END');

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];
  await runBasic({
    source: trappedSource,
    stdin: ["0", "0,101", "99,100", "100,100"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });
  const transcript = output.join("\n");
  assert.match(transcript, /ENTER TWO NUMBERS BETWEEN 1 AND\s+100/);
  assert.match(transcript, /YOU HAVE TRAPPED MY NUMBER/);
  assert.match(transcript, /YOU GOT IT!!!/);
  assert.match(transcript, /ROUND RESTARTED/);
  assert.equal(transcript.match(/GUESS #/g)?.length, 3);
  assert.doesNotMatch(transcript, /SORRY\. THAT'S|Syntax error|Error at line/i);
}

const bywaterBlankSeparatedOutput = [];
await runBywaterBasic({
  source: trappedSource,
  stdin: ["0", "99 100", "100 100"],
  onStdout: (line) => bywaterBlankSeparatedOutput.push(line),
  onStderr: (line) => bywaterBlankSeparatedOutput.push(line),
});
assert.match(
  bywaterBlankSeparatedOutput.join("\n"),
  /YOU HAVE TRAPPED MY NUMBER[\s\S]*YOU GOT IT!!!/,
);

const targets = [];
for (let seed = 1; seed <= 100; seed += 1) {
  const source = originalSource
    .replace("180  X=INT(N*RND(0))+1", `180 RANDOMIZE ${seed}:X=INT(N*RND(0))+1`)
    .replace("190  FOR Q=1 TO G", '190 PRINT "TARGET";X:END');
  const output = [];
  await runRetroBasic({
    source,
    stdin: ["0"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });
  const match = output.join("\n").match(/TARGET\s+(\d+)/);
  assert.ok(match, `seed ${seed} produces a target`);
  targets.push(Number(match[1]));
}

assert.ok(targets.every((target) => target >= 1 && target <= 100));
assert.ok(new Set(targets).size >= 50, "targets span much of the 1–100 range");
assert.ok(
  targets.filter((target) => target === 100).length <= 5,
  "100 is not disproportionately selected",
);

console.log("test: 101 Trap validates ranges, requires an exact guess, and varies its target");
