import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runBasic } from "../packages/retrobasic-wasm/dist/index.js";

const stdout = [];
const stderr = [];
const source = readFileSync(process.argv[2], "utf8");
let started = false;

await runBasic({
  source,
  stdin: Array(100).fill("0"),
  onStdout: (line) => {
    stdout.push(line);
    if (!started) {
      started = true;
      process.stdout.write("__BASICADE_STARTED__\n");
    }
  },
  onStderr: (line) => {
    stderr.push(line);
    process.stderr.write(`${line}\n`);
  },
});

const output = `${stdout.join("\n")}\n${stderr.join("\n")}`;
assert.ok(started, "program produced no startup output");
assert.doesNotMatch(
  output,
  /Bad input character|Syntax error|Parse error|Unknown command|Error at line/,
  "program did not start cleanly",
);
