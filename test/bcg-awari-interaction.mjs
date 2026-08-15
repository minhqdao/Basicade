import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { runBasic as runBywaterBasic } from "../packages/bwbasic-wasm/dist/index.js";
import { runBasic as runRetroBasic } from "../packages/retrobasic-wasm/dist/index.js";

const source = await readFile(
  "examples/basic-computer-games/awari.bas",
  "utf8",
);

const interpreters = [
  ["Bywater BASIC", runBywaterBasic],
  ["RetroBASIC", runRetroBasic],
];

async function play(name, runBasic, stdin) {
  const output = [];
  const errors = [];

  await runBasic({
    source,
    stdin,
    onStdout: (line) => output.push(line),
    onStderr: (line) => errors.push(line),
  });
  // RetroBASIC sets the host process status when scripted input ends while
  // the replayed game is waiting at its next prompt.
  process.exitCode = undefined;

  const diagnostics = errors.join("\n");
  assert.equal(diagnostics, "", `${name} reports no Awari errors`);
  return output.join("\n");
}

const playerWin = [
  "6",
  "5",
  "4",
  "1",
  "6",
  "3",
  "4",
  "1",
  "6",
  "5",
  "4",
  "3",
  "2",
  "1",
  "2",
  "1",
  "6",
  "1",
  "6",
  "5",
  "2",
  "3",
  "4",
  "1",
  "6",
];

for (const [name, runBasic] of interpreters) {
  const computerBonus = await play(name, runBasic, ["6", "5"]);
  assert.match(
    computerBonus,
    /MY MOVE IS 2,6[\s\S]*YOUR MOVE\?/,
    `${name} continues after the computer's bonus move`,
  );

  const repeatedPlayerBonus = await play(name, runBasic, [
    "6",
    "5",
    "4",
    "3",
    "1",
  ]);
  assert.match(
    repeatedPlayerBonus,
    /AGAIN\?[\s\S]*AGAIN\?[\s\S]*MY MOVE IS 3[\s\S]*YOUR MOVE\?/,
    `${name} continues after consecutive player bonus moves`,
  );

  const loss = await play(name, runBasic, ["1", "2", "3", "4", "5", "6"]);
  assert.match(loss, /I WIN BY\s*19\s*POINTS/, `${name} plays to a loss`);

  const win = await play(name, runBasic, playerWin);
  assert.match(win, /YOU WIN BY\s*7\s*POINTS/, `${name} plays to a win`);
}

console.log(
  "test: BCG Awari handles bonus turns and complete games in both interpreters",
);
