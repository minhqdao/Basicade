import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizeTerminalOutput } from "../demos/terminal-output.js";

const source = readFileSync(
  "examples/basic-computer-games/hammurabi.bas",
  "utf8",
);

for (const interpreter of ["bwbasic", "retrobasic"]) {
  const { runBasic } = await import(
    `../packages/${interpreter}-wasm/dist/index.js`
  );
  const output = [];
  const errors = [];

  const exitCode = await runBasic({
    source,
    stdin: ["0", "0", "0", "0"],
    onStdout: (line) => output.push(line),
    onStderr: (line) => errors.push(line),
  });

  const rawOutput = output.join("\n");
  const terminalOutput = sanitizeTerminalOutput(rawOutput);

  assert.equal(exitCode, 0, `${interpreter} exits successfully`);
  assert.equal(errors.length, 0, `${interpreter} does not write errors`);
  assert.match(rawOutput, /SO LONG FOR NOW\./, `${interpreter} reaches end`);
  assert.equal(
    rawOutput.split("\u0007").length - 1,
    10,
    `${interpreter} emits the original ten BEL characters`,
  );
  assert.doesNotMatch(
    terminalOutput,
    /\u0007/,
    `${interpreter} terminal output removes BEL characters`,
  );
  assert.match(
    terminalOutput,
    /SO LONG FOR NOW\./,
    `${interpreter} terminal output preserves the farewell`,
  );
}

console.log("test: Hammurabi terminal output omits BEL control characters");
