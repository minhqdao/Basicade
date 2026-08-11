import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/digits.bas",
  "utf8",
);

const initializationSource = originalSource.replace(
  "510 X=0",
  '510 PRINT "INITIAL VALUES";M(26,0);M(26,1);M(26,2);K(2,0);K(2,1);K(2,2);L(8,0);L(8,1);L(8,2):END',
);
const initializationOutput = [];
await runBasic({
  source: initializationSource,
  stdin: ["0"],
  onStdout: (line) => initializationOutput.push(line),
  onStderr: (line) => initializationOutput.push(line),
});
assert.match(
  initializationOutput.join("\n"),
  /INITIAL VALUES\s+1\s+1\s+1\s+9\s+9\s+9\s+3\s+3\s+2/,
  "all prediction-table entries must receive their intended initial values",
);

const learningSource = originalSource
  .replace("689 R=INT(H*RND)+1", "689 R=2")
  .replace(
    "880 Z1=Z-INT(Z/9)*9",
    '880 PRINT "LEARNED ZERO";M(26,0):END',
  );
const learningOutput = [];
await runBasic({
  source: learningSource,
  stdin: ["0", "0,1,2,0,1,2,0,1,2,0"],
  onStdout: (line) => learningOutput.push(line),
  onStderr: (line) => learningOutput.push(line),
});
assert.match(
  learningOutput.join("\n"),
  /\b1\s+0\s+WRONG\b[\s\S]*LEARNED ZERO\s+2/,
  "an incorrectly guessed zero must still train the predictor",
);

const source = originalSource.replace(
  '630 PRINT\\PRINT "MY GUESS","YOUR NO.","RESULT","NO. RIGHT"\\PRINT',
  '630 PRINT "ACCEPTED TEN NUMBERS":END',
);

assert.notEqual(source, originalSource, "Digits input path was instrumented");

for (const input of [
  "0,1,2,0,1,2,0,1,2,0",
  "0 1 2 0 1 2 0 1 2 0",
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["0", input],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(
    transcript,
    /TEN NUMBERS PLEASE \(SEPARATE WITH COMMAS OR SPACES\)/,
  );
  assert.match(transcript, /ACCEPTED TEN NUMBERS/);
  assert.doesNotMatch(transcript, /USE ONLY THE DIGITS/);
  assert.doesNotMatch(transcript, /Redo from start|Bad input|Error at line/i);
}

const completeGameOutput = [];
await runBasic({
  source: originalSource,
  stdin: [
    "0",
    "0,1,2,0,1,2,0,1,2,0",
    "1 2 0 1 2 0 1 2 0 1",
    "2,0,1,2,0,1,2,0,1,2",
    "0",
  ],
  onStdout: (line) => completeGameOutput.push(line),
  onStderr: (line) => completeGameOutput.push(line),
});

const completeGame = completeGameOutput.join("\n");
assert.equal(completeGame.match(/TEN NUMBERS PLEASE/g)?.length, 3);
assert.equal(
  completeGame
    .split("\n")
    .filter(
      (line) => /\b(?:RIGHT|WRONG)\b/.test(line) && !line.includes("NO. RIGHT"),
    ).length,
  30,
);
assert.match(
  completeGame,
  /I WIN\.|IT IS A TIE GAME\.|YOU BEAT ME\.\s+CONGRATULATIONS/,
);
assert.match(completeGame, /THANKS FOR THE GAME\./);
assert.doesNotMatch(
  completeGame,
  /UNDEFINED STATEMENT|Undefined target|Error at line/i,
);

const tiedGuessOutput = [];
const tiedGuessSource = originalSource
  .replace(
    "674 V(J)=A*K(Z2,J)+B*L(Z1,J)+C*M(Z,J)",
    "674 V(J)=1",
  )
  .replace("780 IF G=N(U) THEN 810", "780 GOTO 880");
const tiedGuessInput = ["0"];
for (let game = 0; game < 30; game += 1) {
  tiedGuessInput.push(
    "0,1,2,0,1,2,0,1,2,0",
    "1,2,0,1,2,0,1,2,0,1",
    "2,0,1,2,0,1,2,0,1,2",
    game === 29 ? "0" : "1",
  );
}
await runBasic({
  source: tiedGuessSource,
  stdin: tiedGuessInput,
  onStdout: (line) => tiedGuessOutput.push(line),
  onStderr: (line) => tiedGuessOutput.push(line),
});
const tiedGuessCounts = [0, 0, 0];
for (const line of tiedGuessOutput) {
  const values = line.trim().split(/\s+/);
  if (values.length !== 20 || values.some((value) => !/^[012]$/.test(value))) {
    continue;
  }
  for (let index = 0; index < values.length; index += 2) {
    tiedGuessCounts[Number(values[index])] += 1;
  }
}
assert.equal(tiedGuessCounts.reduce((sum, count) => sum + count, 0), 900);
for (const count of tiedGuessCounts) {
  assert.ok(
    count >= 240 && count <= 360,
    `tied guesses must be approximately uniform; got ${tiedGuessCounts.join(", ")}`,
  );
}

console.log(
  "test: 101 Digits accepts both input formats, learns every digit, breaks ties fairly, and completes a game",
);
