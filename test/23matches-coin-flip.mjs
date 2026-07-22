import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "examples/basic-computer-games/23matches.bas",
  "utf8",
);

assert.doesNotMatch(
  source,
  /^\d+ RANDOMIZE(?:\s|$)/m,
  "23 Matches relies on the interpreters' default run seeds",
);

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const randomValues = new Set();
  const { runBasic } = await import(
    `../packages/${interpreter}-wasm/dist/index.js`
  );

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const output = [];

    await runBasic({
      source: "10 PRINT RND(1)\n20 END",
      stdin: [],
      onStdout: (line) => output.push(line),
      onStderr: () => {},
    });

    const randomValue = output.join("\n").trim();
    assert.notEqual(randomValue, "", `${interpreter} prints an RND value`);
    randomValues.add(randomValue);
  }

  assert.ok(
    randomValues.size > 1,
    `${interpreter} automatically seeds fresh runs`,
  );

  const output = [];
  await runBasic({
    source,
    stdin: Array(20).fill("1"),
    onStdout: (line) => output.push(line),
    onStderr: () => {},
  });
  assert.match(
    output.join("\n"),
    /(HEADS!|TAILS!)/,
    `${interpreter} starts 23 Matches without a program-level seed`,
  );
}

console.log("test: both WASM interpreters auto-seed 23 Matches");
