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

const fairwaySource = originalSource
  .replace("640LETL=INT(RND(0)*100)", "640LETL=0")
  .replace("870GOTO540", '870PRINT"FAIRWAY SHOT COMPLETE":END');
const fairwayOutput = [];

await runRetroBasic({
  source: fairwaySource,
  stdin: ["N", "1", "1", "1"],
  onStdout: (line) => fairwayOutput.push(line),
  onStderr: (line) => fairwayOutput.push(line),
});

const fairwayTranscript = fairwayOutput.join("\n");
assert.match(
  fairwayTranscript,
  /DISTANCE OF SHOT IS\s+(1[5-9][0-9]|2[0-6][0-9]|270)\s+YARDS/,
);
assert.match(fairwayTranscript, /FAIRWAY SHOT COMPLETE/);
assert.doesNotMatch(
  fairwayTranscript,
  /TYPE MISMATCH|BAD SUBSCRIPT|Syntax error|Error at line/i,
);

const driveDistances = new Set();
for (let seed = 1; seed <= 20; seed += 1) {
  const driveSource = originalSource
    .replace("100RANDOMIZE", `100RANDOMIZE ${seed}`)
    .replace(
      "600 IFX=9THEN970",
      '600PRINT"DRIVE DISTANCE";X(1):END',
    );
  const driveOutput = [];

  await runRetroBasic({
    source: driveSource,
    stdin: ["N", "1", "1", "1"],
    onStdout: (line) => driveOutput.push(line),
    onStderr: (line) => driveOutput.push(line),
  });

  const match = driveOutput.join("\n").match(/DRIVE DISTANCE\s+(\d+)/);
  assert.ok(match, `seed ${seed} produces a driver distance`);
  const distance = Number(match[1]);
  assert.ok(distance >= 150 && distance <= 270);
  driveDistances.add(distance);
}
assert.ok(
  driveDistances.size >= 10,
  `driver distance must vary; got ${[...driveDistances].join(", ")}`,
);

const completedHoleSource = originalSource
  .replace("640LETL=INT(RND(0)*100)", "640LETL=0")
  .replace("1160LETX(1)=INT(121*RND(0)+150)", "1160LETX(1)=270")
  .replace("1260LETX(7)=INT(41*RND(0)+30)", "1260LETX(7)=70")
  .replace("1310LETX(9)=INT(3*RND(0)+1)", "1310LETX(9)=2");
const completedHoleOutput = [];

await runRetroBasic({
  source: completedHoleSource,
  stdin: ["N", "1", "1", "1", "7", "7", "9"],
  onStdout: (line) => completedHoleOutput.push(line),
  onStderr: (line) => completedHoleOutput.push(line),
});

const completedHoleTranscript = completedHoleOutput.join("\n");
assert.match(completedHoleTranscript, /ON THE GREEN \(ENTER 9 FOR PUTTER\)/);
assert.match(completedHoleTranscript, /USE CLUB 9 TO PUTT/);
assert.match(completedHoleTranscript, /2\s+PUTTS/);
assert.match(
  completedHoleTranscript,
  /4\s+STROKES FOR HOLE NUMBER\s+1\s+FOR PLAYER\s+1/,
);
assert.match(
  completedHoleTranscript,
  /PLAYER NUMBER\s+1\s+SHOT\s+4\s+FOR\s+1\s+HOLES PAR IS\s+4/,
);
assert.doesNotMatch(
  completedHoleTranscript,
  /TYPE MISMATCH|BAD SUBSCRIPT|Syntax error|Error at line/i,
);

console.log("test: 101 Golf varies club distance and completes a putting flow");
