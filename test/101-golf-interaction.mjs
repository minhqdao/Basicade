import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/golf.bas",
  "utf8",
);
const source = originalSource.replace(
  "550INPUT X",
  '550PRINT"FIRST CLUB CHOICE REACHED":END',
);

assert.notEqual(source, originalSource, "Golf first-hole path was instrumented");

for (const holes of ["1", "18"]) {
  const output = [];

  await runRetroBasic({
    source,
    stdin: ["N", "1", holes],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(transcript, /HOLE NUMBER\s+1\s+IS\s+360\s+YARDS PAR\s+4/);
  assert.match(
    transcript,
    /FIRST CLUB CHOICE REACHED/,
    `RetroBASIC starts a ${holes}-hole game`,
  );
  assert.doesNotMatch(transcript, /TYPE MISMATCH|Syntax error|Error at line/i);
}

console.log("test: 101 Golf reaches the first hole with RetroBASIC");
