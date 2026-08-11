import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/footbl.bas",
  "utf8",
);
const source = originalSource.replace(
  "630 GOSUB 2250",
  '630 PRINT "RECEIVE CHOICE ACCEPTED";S:END',
);

assert.notEqual(
  source,
  originalSource,
  "Professional Football receive path was instrumented",
);

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  for (const [receive, expectedSide] of [
    ["0", "1"],
    ["1", "2"],
  ]) {
    const output = [];

    await runBasic({
      source,
      stdin: ["0", receive],
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });

    const transcript = output.join("\n");
    assert.match(
      transcript,
      /DO YOU WANT TO RECEIVE \(0 FOR NO, 1 FOR YES\)/,
    );
    assert.match(
      transcript,
      new RegExp(`RECEIVE CHOICE ACCEPTED\\s+${expectedSide}`),
      `${interpreter} accepts receive choice ${receive}`,
    );
    assert.doesNotMatch(transcript, /WRONG, TRY AGAIN|Syntax error|Error at line/i);
  }
}

const defenseSource = originalSource
  .replace(
    "630 GOSUB 2250",
    "630 LET S=1:LET C=900:LET B=20:LET D=1:LET F=0:GOTO 830",
  )
  .replace(
    "1050 IF RND(X)>Z(M-1,Y1) THEN 1240",
    '1050 PRINT "DEFENSE ACCEPTED";Y1:END',
  );

assert.notEqual(
  defenseSource,
  originalSource,
  "Professional Football defense path was instrumented",
);

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source: defenseSource,
    stdin: ["0", "1", "4"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(
    transcript,
    /DEFENSE ACCEPTED\s+0/,
    `${interpreter} maps defense 4 to the first valid strategy column`,
  );
  assert.doesNotMatch(
    transcript,
    /Subscript out of range|BAD SUBSCRIPT|Error at line/i,
  );
}

const offenseSource = originalSource
  .replace(
    "630 GOSUB 2250",
    "630 LET S=2:LET C=900:LET B=20:LET D=1:LET F=0:GOTO 830",
  )
  .replace(
    "1050 IF RND(X)>Z(M-1,Y1) THEN 1240",
    '1050 PRINT "OFFENSE ACCEPTED";M:END',
  );

assert.notEqual(
  offenseSource,
  originalSource,
  "Professional Football offense path was instrumented",
);

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source: offenseSource,
    stdin: ["0", "1", "4", "10"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.equal(
    transcript.match(/YOUR PLAY/g)?.length,
    2,
    `${interpreter} asks again after a defensive code is entered on offense`,
  );
  assert.match(transcript, /OFFENSE ACCEPTED\s+1/);
  assert.doesNotMatch(
    transcript,
    /Subscript out of range|BAD SUBSCRIPT|Error at line/i,
  );
}

const laterDownSource = originalSource
  .replace("420 RANDOMIZE", "420 RANDOMIZE 2")
  .replace(
    "630 GOSUB 2250",
    "630 LET S=1:LET C=655:LET B=15:LET D=1:LET F=0:GOTO 830",
  )
  .replace(
    "1050 IF RND(X)>Z(M-1,Y1) THEN 1240",
    "1050 LET N=N+1:IF N=3 THEN 3740\n1052 GOTO 1240",
  )
  .concat('\n3740 PRINT "THIRD AI PLAY";M:END\n');
const laterDownOutput = [];

await runRetroBasic({
  source: laterDownSource,
  stdin: ["0", "1", "6", "6", "6"],
  onStdout: (line) => laterDownOutput.push(line),
  onStderr: (line) => laterDownOutput.push(line),
});

const laterDownTranscript = laterDownOutput.join("\n");
assert.match(
  laterDownTranscript,
  /THIRD AI PLAY\s+[1-6]\b/,
  "RetroBASIC keeps the computer play in range on later downs",
);
assert.doesNotMatch(
  laterDownTranscript,
  /BAD SUBSCRIPT|Array subscript out of bounds|Error at line/i,
);

console.log(
  "test: 101 Professional Football validates choices and later-down computer plays",
);
