#!/usr/bin/env node

/**
 * RetroBASIC echo test — validates stdin, stdout, and basic program execution.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runBasic } from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "basic", "echo.bas"), "utf8");

const outputs = [];
const stderrOutput = [];

const exitCode = await runBasic({
  source,
  stdin: ["World"],
  onStdout: (line) => outputs.push(line),
  onStderr: (line) => stderrOutput.push(line),
});

const full = outputs.join("\n");
const stderr = stderrOutput.join("\n");

let passed = 0;
let failed = 0;

function check(label, ok) {
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✲ ${label}`);
    failed++;
  }
}

console.log("test: echo + stdin (retrobasic-wasm)");
console.log("");

check("exit code is 0", exitCode === 0);
check("produced output", outputs.length > 0);
check("echoed user input", /HELLO, World!/i.test(full));
check("no runtime errors on stderr", stderr.length === 0);

console.log("");
console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("\n--- captured output ---");
  console.log(full);
  if (stderr) console.log("\n--- stderr ---\n" + stderr);
  process.exit(1);
}
