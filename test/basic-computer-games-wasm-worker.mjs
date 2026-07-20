import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [interpreter, sourcePath] = process.argv.slice(2);
const { runBasic } = await import(
  `../packages/${interpreter}-wasm/dist/index.js`
);

let started = false;
const output = [];

await runBasic({
  source: readFileSync(sourcePath, "utf8"),
  stdin: Array(100).fill("0"),
  onStdout: (line) => {
    output.push(line);
    if (!started) {
      started = true;
      process.stdout.write("__BASICADE_STARTED__\n");
    }
  },
  onStderr: (line) => {
    output.push(line);
    process.stderr.write(`${line}\n`);
  },
});

assert.ok(started, "program produced no startup output");
assert.doesNotMatch(
  output.join("\n"),
  /Bad input character|Syntax error|Parse error|Unknown command|Error at line/i,
  "program did not start cleanly",
);
