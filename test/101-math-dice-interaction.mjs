import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/mathd.bas",
  "utf8",
);

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const pairs = [];

  for (let seed = 1; seed <= 20; seed += 1) {
    const source = originalSource
      .replace("100 RANDOMIZE", `100 RANDOMIZE ${seed}`)
      .replace("500 LET T=D+A", '500 PRINT "DICE PAIR";A;D:END');
    const output = [];

    await runBasic({
      source,
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });

    const transcript = output.join("\n");
    const match = transcript.match(/DICE PAIR\s+(\d+)\s+(\d+)/);
    assert.ok(match, `${interpreter} seed ${seed} produces two dice`);
    const pair = [Number(match[1]), Number(match[2])];
    assert.ok(pair.every((die) => die >= 1 && die <= 6));
    pairs.push(pair);
    assert.doesNotMatch(transcript, /Syntax error|Error at line/i);
  }

  assert.ok(
    pairs.some(([first, second]) => first !== second),
    `${interpreter} generates non-matching dice; got ${JSON.stringify(pairs)}`,
  );
}

console.log("test: 101 Math Dice generates independent dice values");
