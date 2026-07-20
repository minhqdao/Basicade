#!/usr/bin/env node

import { runBasic } from "../dist/index.js";

const output = [];
const errors = [];
const input = Object.freeze(["Ada", "Lovelace"]);

const exitCode = await runBasic({
  source: `
    10 INPUT A$
    20 INPUT B$
    30 PRINT A$; " "; B$
    40 END
  `,
  stdin: input,
  onStdout: (line) => output.push(line),
  onStderr: (line) => errors.push(line),
});

const fullOutput = output.join("\n");
const fullErrors = errors.join("\n");
const concurrentOutput = [];
const concurrentExitCodes = await Promise.all(
  ["First", "Second"].map((message) =>
    runBasic({
      source: `10 PRINT "${message}"\n20 END`,
      onStdout: (line) => concurrentOutput.push(line),
    }),
  ),
);
const checks = [
  ["returns a successful exit code", exitCode === 0],
  ["reads multiple stdin lines in order", /Ada\s+Lovelace/i.test(fullOutput)],
  ["does not mutate the caller's input", input.join(",") === "Ada,Lovelace"],
  ["does not write to stderr", fullErrors.length === 0],
  [
    "keeps concurrent interpreter instances isolated",
    concurrentExitCodes.every((code) => code === 0) &&
      concurrentOutput.includes("First") &&
      concurrentOutput.includes("Second"),
  ],
];

console.log("test: runBasic public API (retrobasic-wasm)\n");
for (const [label, passed] of checks) {
  console.log(`  ${passed ? "✓" : "✗"} ${label}`);
}

if (checks.some(([, passed]) => !passed)) {
  console.log(`\n--- stdout ---\n${fullOutput}`);
  if (fullErrors) console.log(`\n--- stderr ---\n${fullErrors}`);
  process.exit(1);
}
