import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sourcePath = "examples/basic-computer-games/hangman.bas";
const originalSource = readFileSync(sourcePath, "utf8");
const source = originalSource
  .replace(/100 Q=.*\r?\n/, "100 Q=1\n")
  .replace('700 DATA "GUM","SIN","FOR","CRY","LUG","BYE","FLY"', '700 DATA "SEE"');
const input = ["S", "E", "NO"];

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
  assert.match(terminal, /S--/, `${interpreter} shows the first letter`);
  assert.match(terminal, /YOU FOUND THE WORD!/, `${interpreter} accepts E as the next letter`);
  assert.doesNotMatch(
    terminal,
    /WHAT IS YOUR GUESS FOR THE WORD|WRONG\.  TRY ANOTHER LETTER\./,
    `${interpreter} does not consume the next letter as a word guess`,
  );
}

console.log("test: Hangman preserves earlier letter positions");
