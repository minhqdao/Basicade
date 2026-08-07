import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { games } from "../demos/catalog.js";

const bywaterGames = [
  "1check",
  "23mtch",
  "3dplot",
  "aceydu",
  "amazin",
  "bagels",
  "basket",
  "batnum",
  "boxing",
  "bounce",
  "buzzwd",
  "change",
  "chemst",
  "chief",
  "chomp",
  "dice",
  "even",
  "even1",
  "footbl",
  "gunner",
  "litqz",
  "mathd",
  "mugwump",
  "number",
  "pizza",
  "reverse",
  "rusrou",
  "stars",
  "trap",
  "wekday",
];
const bywaterInput = {
  basket: ["6", "CPU", ...Array(100).fill("1")],
  bounce: [".1", "50", ".8"],
  buzzwd: ["1,1,1", "100,100,100"],
  wekday: ["8,8,2026", "1,1,2000"],
};
const retrobasicGames = [
  "bagels",
  "bug",
  "flipflop",
  "golf",
  "lem",
  "letter",
  "orbit",
];
const jobs = [
  ...bywaterGames.map((game) => ({
    game: `101-${game}`,
    interpreter: "bwbasic",
    input: bywaterInput[game],
    sourcePath: resolve("examples/101-basic-computer-games", `${game}.bas`),
  })),
  ...retrobasicGames.map((game) => ({
    game: `bcg-${game}`,
    interpreter: "retrobasic",
    sourcePath: resolve("examples/basic-computer-games", `${game}.bas`),
  })),
];
const workerPath = resolve("test/basic-computer-games-wasm-worker.mjs");
const failures = [];
let nextJob = 0;

for (const { game, interpreter } of jobs) {
  assert.ok(
    games[game].interpreters.includes(interpreter),
    `${game} exposes ${interpreter} in the launcher`,
  );
}

function testCombination(job) {
  return new Promise((resolveTest) => {
    const child = spawn(process.execPath, [
      workerPath,
      job.interpreter,
      job.sourcePath,
      job.input ? JSON.stringify(job.input) : "1",
      "strict",
    ]);
    let output = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 2_000);

    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (chunk) => {
        output += chunk;
      });
    }
    child.on("close", () => {
      clearTimeout(timeout);
      if (
        timedOut ||
        !output.includes("__BASICADE_STARTED__") ||
        output.includes("AssertionError")
      ) {
        failures.push({ ...job, output: output.slice(0, 1_000) });
      }
      resolveTest();
    });
  });
}

async function runWorker() {
  while (nextJob < jobs.length) await testCombination(jobs[nextJob++]);
}

await Promise.all(Array.from({ length: 4 }, runWorker));
assert.deepEqual(
  failures,
  [],
  failures
    .map(
      ({ game, interpreter, output }) =>
        `${game} (${interpreter}): ${output}`,
    )
    .join("\n\n"),
);

console.log(`test: verified ${jobs.length} newly enabled game/interpreter pairs`);
