import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/mugwump.bas",
  "utf8",
);
const source = originalSource
  .replace("240  GOSUB 1000", "240 GOSUB 1000:GOTO 250")
  .replace(
    "1050  RETURN",
    '1050 PRINT "POSITIONS";P(1,1);P(1,2);P(2,1);P(2,2);P(3,1);P(3,2);P(4,1);P(4,2):RETURN',
  )
  .replace("470  IF T<10 THEN 260", "470 END");

assert.notEqual(source, originalSource, "Mugwump round was instrumented");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["0,0"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  const positions = transcript.match(/POSITIONS((?:\s+\d+){8})/);
  assert.ok(positions, `${interpreter} places four Mugwumps`);
  const coordinates = positions[1].trim().split(/\s+/).map(Number);
  assert.ok(
    coordinates.every((coordinate) => coordinate >= 0 && coordinate <= 9),
    `${interpreter} keeps coordinates inside the 0–9 grid`,
  );

  const hiddenAtHome = coordinates.filter(
    (coordinate, index) => index % 2 === 0 && coordinate === 0 && coordinates[index + 1] === 0,
  ).length;
  assert.equal(
    transcript.match(/YOU HAVE FOUND MUGWUMP/g)?.length ?? 0,
    hiddenAtHome,
    `${interpreter} only finds Mugwumps actually located at 0,0`,
  );
  assert.doesNotMatch(transcript, /YOU GOT THEM ALL IN\s+1\s+TURNS/);
  assert.doesNotMatch(transcript, /Syntax error|Error at line/i);
}

console.log("test: 101 Mugwump places and finds Mugwumps by exact coordinates");
