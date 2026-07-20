import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { games } from "../demos/catalog.js";

const gamesToTest = Object.values(games).filter(
  (game) => game.collection === "BASIC Computer Games",
);
const workerPath = resolve("test/basic-computer-games-wasm-worker.mjs");
const jobs = gamesToTest.flatMap((game) =>
  game.interpreters.map((interpreter) => ({ game, interpreter })),
);
const concurrency = 4;
let nextJob = 0;

function smokeTest({ game, interpreter }) {
  return new Promise((resolveTest) => {
    const child = spawn(process.execPath, [
      workerPath,
      interpreter,
      resolve(game.sourcePath),
    ]);
    let output = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 1_500);

    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", (error) =>
      resolveTest({
        game,
        interpreter,
        error: error.message,
      }),
    );
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      const started = output.includes("__BASICADE_STARTED__");
      const hasInterpreterError =
        /AssertionError|Bad input character|Syntax error|Parse error|Unknown command|Error at line/i.test(
          output,
        );
      if (!started || hasInterpreterError) {
        resolveTest({
          game,
          interpreter,
          error: `failed WASM startup smoke test${timedOut ? " (timed out)" : ""}${exitCode ? ` (exit ${exitCode})` : ""}: ${output.slice(0, 500)}`,
        });
        return;
      }
      resolveTest();
    });
  });
}

async function runWorker() {
  while (nextJob < jobs.length) {
    const result = await smokeTest(jobs[nextJob++]);
    if (result) failures.push(result);
  }
}

const failures = [];
await Promise.all(Array.from({ length: concurrency }, runWorker));

assert.equal(gamesToTest.length, 104);
assert.equal(jobs.length, 198);
assert.deepEqual(
  failures,
  [],
  failures
    .map(
      ({ game, interpreter, error }) => `${game.id} (${interpreter}): ${error}`,
    )
    .join("\n\n"),
);
console.log(
  `test: started ${gamesToTest.length} BASIC Computer Games with ${jobs.length} WASM interpreter combinations`,
);
