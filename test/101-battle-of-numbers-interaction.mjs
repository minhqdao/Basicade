import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const originalSource = readFileSync(
  "examples/101-basic-computer-games/batnum.bas",
  "utf8",
);
const source = originalSource
  .replace('330 PRINT "ENTER PILE SIZE:";', '330 G=G+1:IF G=2 THEN 1080\n335 PRINT "ENTER PILE SIZE:";')
  .replace("1080 END", '1080 PRINT "RESTARTED BATTLE":END');
assert.notEqual(source, originalSource, "Battle replay was instrumented");

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const { runBasic } = await import(
    `../packages/${interpreter}-wasm/dist/index.js`
  );
  const output = [];

  await runBasic({
    source,
    stdin: ["23", "2", "1,3", "2", "3", "3", "3", "3", "3", "1"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(transcript, /ENTER WIN OPTION/);
  assert.match(transcript, /ENTER MIN AND MAX/);
  assert.match(transcript, /ENTER START OPTION/);
  assert.match(transcript, /YOUR MOVE/);
  assert.match(transcript, /COMPUTER TAKES\s+\d+\s+AND LEAVES\s+\d+/);
  assert.match(transcript, /TOUGH LUCK, YOU LOSE/);
  assert.match(transcript, /RESTARTED BATTLE/);
  assert.doesNotMatch(transcript, /COMPUTER TAKES\s+1\s+AND LOSES/);
  assert.doesNotMatch(transcript, /ILLEGAL MOVE|NEXT WITHOUT FOR|REDO FROM START/);
}

console.log("test: 101 Battle of Numbers accepts setup and a legal move");
