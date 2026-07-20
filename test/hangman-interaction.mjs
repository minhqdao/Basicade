import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sourcePath = "examples/basic-computer-games/hangman.bas";
const originalSource = readFileSync(sourcePath, "utf8");
const source = originalSource.replace(/100 Q=.*\r?\n/, "100 Q=9\n");
const input = ["E", "X", "A", "X", "C", "X", "H", "NO"];

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const { runBasic } = await import(
    `../packages/${interpreter}-wasm/dist/index.js`
  );
  const output = [];

  await runBasic({
    source,
    stdin: input,
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const terminal = output.join("\n");
  assert.match(terminal, /E---/, `${interpreter} shows the first letter`);
  assert.match(terminal, /EA--/, `${interpreter} preserves the first letter`);
  assert.doesNotMatch(terminal, /-A--/, `${interpreter} uses the correct position`);
}

console.log("test: Hangman preserves earlier letter positions");
