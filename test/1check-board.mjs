import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "examples/101-basic-computer-games/1check.bas",
  "utf8",
);

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const { runBasic } = await import(
    `../packages/${interpreter}-wasm/dist/index.js`
  );
  const stdout = [];
  const stderr = [];

  await runBasic({
    source,
    stdin: ["0", "NO"],
    onStdout: (line) => stdout.push(line),
    onStderr: (line) => stderr.push(line),
  });

  const output = stdout.join("\n");
  const board = output.match(
    /HERE IS THE NUMERICAL BOARD:([\s\S]*?)AND HERE IS THE OPENING POSITION/,
  )?.[1];
  assert.ok(board, `${interpreter} printed the numerical-board section`);
  assert.deepEqual(
    board.match(/\d+/g)?.map(Number),
    Array.from({ length: 64 }, (_, index) => index + 1),
    `${interpreter} printed every numerical-board position`,
  );
  const rows = board
    .trimEnd()
    .split(/\n/)
    .filter((line) => /\d/.test(line));
  assert.equal(rows.length, 8, `${interpreter} printed eight board rows`);
  for (const row of rows) {
    const finalDigitColumns = [...row.matchAll(/\d+/g)].map(
      (match) => match.index + match[0].length - 1,
    );
    assert.deepEqual(
      finalDigitColumns,
      [1, 5, 9, 13, 17, 21, 25, 29],
      `${interpreter} right-aligned every board column`,
    );
  }
  assert.doesNotMatch(
    `${output}\n${stderr.join("\n")}`,
    /DEBUG:|Error at line|Syntax error|Parse error/,
    `${interpreter} printed the board without interpreter diagnostics`,
  );
}

console.log("test: 1 Check prints its numerical board with both interpreters");
