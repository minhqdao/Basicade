import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const source = readFileSync(
  "examples/101-basic-computer-games/buzzwd.bas",
  "utf8",
);

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["1,1,2", "100,100,100"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(
    transcript,
    /TOTAL ORGANIZATIONAL CAPABILITY/,
    `${interpreter} prints the final-number-2 phrase`,
  );
  assert.match(transcript, /GOODBYE FOR NOW!/);
  assert.doesNotMatch(transcript, /UNDEFINED (?:STATEMENT|LINE)|Undefined line/i);
}

console.log("test: 101 Buzzword handles a final value of 2 with both interpreters");
