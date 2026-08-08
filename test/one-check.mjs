import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "examples/101-basic-computer-games/1check.bas",
  "utf8",
);

const outcomes = [
  {
    name: "strong four-piece finish",
    remaining: 4,
    moves: [
      [33, 19], [12, 26], [16, 30], [64, 46], [39, 21], [8, 22],
      [14, 28], [59, 45], [2, 20], [49, 35], [13, 27], [1, 19],
      [18, 36], [26, 12], [53, 39], [58, 44], [3, 21], [28, 14],
      [56, 38], [57, 43], [41, 27], [61, 47], [48, 30], [40, 54],
      [36, 18], [38, 52], [5, 23], [32, 14], [24, 38], [35, 53],
      [25, 11], [43, 61], [7, 21], [21, 39], [4, 18], [63, 45],
      [45, 31], [31, 13], [60, 46], [39, 53], [9, 27], [6, 20],
      [62, 44], [20, 34],
    ],
  },
  {
    name: "poor 34-piece dead end",
    remaining: 34,
    moves: [
      [7, 21], [2, 20], [1, 19], [58, 44], [64, 46], [16, 30],
      [25, 43], [63, 45], [13, 27], [40, 22], [52, 38], [49, 35],
      [18, 36], [47, 29],
    ],
  },
];

function initialBoard() {
  const board = Array(64).fill(true);
  for (let row = 2; row <= 5; row++) {
    for (let column = 2; column <= 5; column++) {
      board[row * 8 + column] = false;
    }
  }
  return board;
}

function legalMoves(board) {
  const moves = [];
  for (let from = 0; from < 64; from++) {
    if (!board[from]) continue;
    const row = Math.floor(from / 8);
    const column = from % 8;
    for (const [rowOffset, columnOffset] of [
      [-2, -2],
      [-2, 2],
      [2, -2],
      [2, 2],
    ]) {
      const toRow = row + rowOffset;
      const toColumn = column + columnOffset;
      if (toRow < 0 || toRow >= 8 || toColumn < 0 || toColumn >= 8) continue;
      const to = toRow * 8 + toColumn;
      const jumped = (from + to) / 2;
      if (board[jumped] && !board[to]) moves.push([from, to]);
    }
  }
  return moves;
}

function validateOutcome(outcome) {
  const board = initialBoard();
  for (const [fromNumber, toNumber] of outcome.moves) {
    const from = fromNumber - 1;
    const to = toNumber - 1;
    assert.ok(
      legalMoves(board).some(
        ([legalFrom, legalTo]) => legalFrom === from && legalTo === to,
      ),
      `${outcome.name} contains legal move ${fromNumber} to ${toNumber}`,
    );
    board[from] = false;
    board[(from + to) / 2] = false;
    board[to] = true;
  }
  assert.equal(
    board.filter(Boolean).length,
    outcome.remaining,
    `${outcome.name} has the expected number of pieces`,
  );
  assert.deepEqual(
    legalMoves(board),
    [],
    `${outcome.name} ends with no possible jumps`,
  );
}

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

for (const outcome of outcomes) {
  validateOutcome(outcome);
  for (const interpreter of ["bwbasic", "retrobasic"]) {
    const { runBasic } = await import(
      `../packages/${interpreter}-wasm/dist/index.js`
    );
    const stdout = [];
    const stderr = [];
    await runBasic({
      source,
      stdin: [...outcome.moves.flat().map(String), "0", "NO"],
      onStdout: (line) => stdout.push(line),
      onStderr: (line) => stderr.push(line),
    });

    const output = `${stdout.join("\n")}\n${stderr.join("\n")}`;
    assert.match(
      output,
      new RegExp(
        `YOU MADE\\s*${outcome.moves.length}\\s*JUMPS AND HAD\\s*${outcome.remaining}\\s*PIECES`,
        "i",
      ),
      `${interpreter} completed the ${outcome.name}`,
    );
    assert.doesNotMatch(
      output,
      /ILLEGAL MOVE|Error at line|Syntax error|Parse error/,
      `${interpreter} accepted every move in the ${outcome.name}`,
    );
  }
}

console.log("test: One Check board and terminal playthroughs");
