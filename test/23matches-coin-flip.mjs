import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "examples/basic-computer-games/23matches.bas",
  "utf8",
);

assert.match(source, /^162 RANDOMIZE$/m, "game seeds its random generator");

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const outcomes = new Set();

  for (const seed of Array.from({ length: 20 }, (_, index) => index + 1)) {
    const seededSource = source.replace(
      "162 RANDOMIZE",
      `162 RANDOMIZE ${seed}`,
    );
    const { runBasic } = await import(
      `../packages/${interpreter}-wasm/dist/index.js`
    );
    const output = [];

    await runBasic({
      source: seededSource,
      stdin: Array(20).fill("1"),
      onStdout: (line) => output.push(line),
      onStderr: () => {},
    });

    const outcome = output.join("\n").match(/(HEADS!|TAILS!)/)?.[1];
    assert.ok(outcome, `${interpreter} reports the coin toss`);
    outcomes.add(outcome);
  }

  assert.deepEqual(
    outcomes,
    new Set(["HEADS!", "TAILS!"]),
    `${interpreter} can produce both coin toss outcomes`,
  );
}

console.log("test: 23 Matches coin toss varies under both WASM interpreters");
