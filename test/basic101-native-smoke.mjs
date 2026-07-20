import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { games } from "../demos/catalog.js";

const interpreterPath = resolve("interpreters/RetroBASIC/retrobasic");
const gamesToTest = Object.values(games).filter(
  (game) => game.collection === "101 BASIC Computer Games",
);

function smokeTest(game) {
  return new Promise((resolveTest, rejectTest) => {
    const child = spawn(interpreterPath, [resolve(game.sourcePath)]);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 1_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectTest);
    child.on("close", () => {
      clearTimeout(timeout);
      const output = `${stdout}\n${stderr}`;
      const hasInterpreterError =
        /Bad input character|Syntax error|Parse error|Unknown command|Error at line/.test(
          output,
        );

      if (!stdout.trim() || hasInterpreterError) {
        rejectTest(
          new Error(`${game.id} did not start cleanly:\n${output.slice(0, 500)}`),
        );
        return;
      }

      resolveTest({ game, timedOut });
    });
    child.stdin.end();
  });
}

const results = await Promise.all(gamesToTest.map(smokeTest));
assert.equal(results.length, 39);
console.log(`test: started ${results.length} 101 BASIC games with RetroBASIC`);
