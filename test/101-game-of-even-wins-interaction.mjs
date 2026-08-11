import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/even1.bas",
  "utf8",
);
const source = originalSource
  .replace("90 P=INT((13*RND+9)/2)*2+1", "90 P=1")
  .replace(
    '370 PRINT "GAME OVER ... YOU WIN!!!":PRINT',
    '370 PRINT "GAME OVER ... YOU WIN!!!":END',
  );

assert.notEqual(source, originalSource, "one-chip endgame was instrumented");

for (const [interpreter, runBasic] of [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
]) {
  const output = [];

  await runBasic({
    source,
    stdin: ["NO"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(transcript, /THERE IS 1 CHIP ON THE BOARD/);
  assert.match(
    transcript,
    /COMPUTER TAKES 1 CHIP\b/,
    `${interpreter} takes the sole remaining chip`,
  );
  assert.doesNotMatch(
    transcript,
    /COMPUTER TAKES [2-9]|LEAVING\s+-/,
    `${interpreter} never takes more chips than remain`,
  );
  assert.doesNotMatch(transcript, /Syntax error|Error at line/i);
}

console.log("test: 101 Game of Even Wins handles a one-chip endgame");
