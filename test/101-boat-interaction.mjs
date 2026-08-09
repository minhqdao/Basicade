import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/boat.bas",
  "utf8",
);

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const { runBasic } = await import(
    `../packages/${interpreter}-wasm/dist/index.js`
  );

  for (const [angle, expected] of [
    [68.5, /YOU (?:MADE A VUL\?N\?ERABLE STRIKE|DAMAGED THE GUN BOAT)/],
    [10, /YOU MISSED!/],
  ]) {
    const output = [];
    const source = originalSource
      .replace("140 LET R=100*RND(0)", "140 LET R=20")
      .replace("240 LET S=10000*RND(0)", "240 LET S=5000")
      .replace("640 GOTO 120", "640 END")
      .replace("690 GO TO 120", "690 END")
      .replace("520 PRINT \"YOU MISSED!\"", '520 PRINT "YOU MISSED!":END');

    await runBasic({
      source,
      stdin: ["NO", String(angle)],
      onStdout: (line) => output.push(line),
      onStderr: (line) => output.push(line),
    });

    const transcript = output.join("\n");
    assert.match(transcript, /BETWEEN\s+66\s+AND\s+70\s+DEGREES/);
    assert.match(transcript, expected);
    assert.doesNotMatch(transcript, /REDO FROM START|SYNTAX ERROR/);
  }
}

console.log("test: 101 Boat reports its firing range and distinguishes hits from misses");
