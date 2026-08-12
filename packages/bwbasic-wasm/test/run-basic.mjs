#!/usr/bin/env node

import { runBasic } from "../dist/index.js";

const output = [];
const errors = [];
const input = Object.freeze(["Ada", "Lovelace"]);

const exitCode = await runBasic({
  source: `
    10 INPUT FIRST$
    20 INPUT LAST$
    30 PRINT FIRST$; " "; LAST$
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
const numericOutput = [];
await runBasic({
  source: `10 INPUT A,B,C\n20 PRINT A;B;C\n30 END`,
  stdin: ["-3.5 6E2 7"],
  onStdout: (line) => numericOutput.push(line),
});
const stringOutput = [];
await runBasic({
  source: `10 INPUT A$\n20 PRINT "[";A$;"]"\n30 END`,
  stdin: ["123 456"],
  onStdout: (line) => stringOutput.push(line),
});
const mixedOutput = [];
await runBasic({
  source: `10 INPUT A,B$\n20 PRINT A;"[";B$;"]"\n30 END`,
  stdin: ["1 123 456"],
  onStdout: (line) => mixedOutput.push(line),
});
const checks = [
  ["returns a successful exit code", exitCode === 0],
  ["reads multiple stdin lines in order", /Ada\s+Lovelace/i.test(fullOutput)],
  ["does not mutate the caller's input", input.join(",") === "Ada,Lovelace"],
  ["does not write to stderr", fullErrors.length === 0],
  [
    "accepts whitespace-separated numeric INPUT values",
    /-3\.5\s+600\s+7/.test(numericOutput.join("\n")),
  ],
  [
    "preserves whitespace inside string INPUT values",
    stringOutput.join("\n").includes("[123 456]"),
  ],
  [
    "preserves a string tail after a whitespace-separated numeric value",
    /1\s+\[123 456\]/.test(mixedOutput.join("\n")),
  ],
  [
    "keeps concurrent interpreter instances isolated",
    concurrentExitCodes.every((code) => code === 0) &&
      concurrentOutput.includes("First") &&
      concurrentOutput.includes("Second"),
  ],
];

console.log("test: runBasic public API (bwbasic-wasm)\n");
for (const [label, passed] of checks) {
  console.log(`  ${passed ? "✓" : "✗"} ${label}`);
}

if (checks.some(([, passed]) => !passed)) {
  console.log(`\n--- stdout ---\n${fullOutput}`);
  if (fullErrors) console.log(`\n--- stderr ---\n${fullErrors}`);
  process.exit(1);
}
