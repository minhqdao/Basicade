import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/bounce.bas",
  "utf8",
);
const source = originalSource.replace("430 GO TO 135", "430 END");
assert.notEqual(source, originalSource, "Bounce replay was instrumented");

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const { runBasic } = await import(
    `../packages/${interpreter}-wasm/dist/index.js`
  );
  const output = [];

  await runBasic({
    source,
    stdin: [".1", "20", ".8"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  const lines = transcript.split("\n");
  assert.match(transcript, /FEET/);
  assert.match(transcript, /SECONDS/);
  assert.ok(
    lines.filter((line) => line.includes("O")).length >= 5,
    `${interpreter} plotted too few ball positions`,
  );
  assert.ok(
    Math.max(...lines.map((line) => line.length)) < 120,
    `${interpreter} produced an oversized plot`,
  );
  assert.doesNotMatch(
    transcript,
    /NEXT WITHOUT FOR|SUBSCRIPT|SYNTAX ERROR|REDO FROM START/,
  );
}

console.log("test: 101 Bounce completes its plot with both interpreters");
