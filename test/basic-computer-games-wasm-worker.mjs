import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [interpreter, sourcePath, input = "0", strict = ""] =
  process.argv.slice(2);
const { runBasic } = await import(
  `../packages/${interpreter}-wasm/dist/index.js`
);
const stdin = input.startsWith("[")
  ? JSON.parse(input)
  : Array(100).fill(input);

let started = false;
const output = [];

await runBasic({
  source: readFileSync(sourcePath, "utf8"),
  stdin,
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
const interpreterErrorPattern = strict
  ? /Bad input character|Syntax error|Parse error|Unknown command|Error at line|NEXT without FOR|FOR without NEXT|ILLEGAL COMMAND|MISSING SPACE AFTER LINE NUMBER|LINE OUT OF ORDER/i
  : /Bad input character|Syntax error|Parse error|Unknown command|Error at line/i;
assert.doesNotMatch(
  output.join("\n"),
  interpreterErrorPattern,
  "program did not start cleanly",
);
