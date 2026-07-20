import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { games } from "../demos/catalog.js";

const gamesToTest = Object.values(games).filter(
  (game) => game.collection === "101 BASIC Computer Games",
);

const workerPath = resolve("test/basic101-wasm-worker.mjs");

for (const game of gamesToTest) {
  await new Promise((resolveTest, rejectTest) => {
    const child = spawn(process.execPath, [workerPath, resolve(game.sourcePath)]);
    let output = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 2_000);

    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", rejectTest);
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      const started = output.includes("__BASICADE_STARTED__");
      const hasInterpreterError =
        /Bad input character|Syntax error|Parse error|Unknown command|Error at line/.test(
          output,
        );
      if (!started || hasInterpreterError) {
        rejectTest(
          new Error(
            `${game.id} failed WASM startup smoke test${timedOut ? " (timed out)" : ""}${exitCode ? ` (exit ${exitCode})` : ""}:\n${output.slice(0, 500)}`,
          ),
        );
        return;
      }
      resolveTest();
    });
  });
}

assert.equal(gamesToTest.length, 39);
console.log(`test: started ${gamesToTest.length} 101 BASIC games with RetroBASIC WASM`);
