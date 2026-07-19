#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const interpreter = process.argv[2];
if (!interpreter) {
  console.error("Usage: node test/retrobasic.mjs <interpreter>");
  console.error("  interpreter: bwbasic | retrobasic");
  process.exit(1);
}

const wasmPath = resolve(
  __dirname,
  "..",
  "packages",
  `${interpreter}-wasm`,
  "wasm",
  `${interpreter}.js`,
);

const { default: createModule } = await import(pathToFileURL(wasmPath).href);

const retroDir = resolve(__dirname, "retrobasic");

const tests = [
  {
    file: "ahl.bas",
    expect: [/Accuracy\s+[\d.]+/i, /Random\s+[\d.]+/i],
  },
  {
    file: "sieve.bas",
    expect: [/PRIMES/],
  },
  {
    file: "amazing.bas",
    input: "5,5\n",
    expect: [/AMAZING PROGRAM/i, /[:.|]/],
  },
  {
    file: "amazin.dbas",
    input: "5,5\n",
    expect: [/WHAT ARE YOUR WIDTH AND LENGTH/, /[:|]/],
  },
  {
    file: "lunar.bas",
    input: Array(16).fill("100").join("\n") + "\n",
    expect: [/MPH/i],
  },
  {
    file: "test.bas",
    input: "X\n2\n2\n1,2,3\nY\n",
    expect: [
      /INT\(4\.5\)\s+should\s+return\s+4\s+4/i,
      /HELLO\s+WORLD/i,
      /successfully\s+GOSUBed/i,
    ],
  },
];

// test.bas uses retrobasic-only features (VARLIST, ! comments) and has
// duplicate line numbers that bwbasic cannot parse.
const skipForBwbasic = new Set(["test.bas"]);

function check(label, ok) {
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

let passed = 0;
let failed = 0;

for (const { file, input, expect } of tests) {
  if (interpreter === "bwbasic" && skipForBwbasic.has(file)) {
    console.log(`test:retrobasic: ${file} (${interpreter}) — skipped (dialect incompatible)`);
    console.log("");
    continue;
  }

  const source = readFileSync(resolve(retroDir, file), "utf8");
  const inputChars = input ? input.split("").reverse() : [];

  const outputs = [];
  const stderrOutput = [];
  let emptyPollCount = 0;
  const MAX_EMPTY_POLLS = 200;

  const mod = await createModule({
    noInitialRun: true,
    print: (line) => outputs.push(line),
    printErr: (line) => stderrOutput.push(line),
    stdin: () => {
      if (inputChars.length === 0) {
        emptyPollCount++;
        if (emptyPollCount > MAX_EMPTY_POLLS) {
          throw new Error(
            "Execution stalled: Program requested more input than was provided in the test script.",
          );
        }
        return null;
      }
      return inputChars.pop().charCodeAt(0);
    },
  });

  mod.FS.writeFile(`/${file}`, source);

  try {
    mod.callMain([`/${file}`]);
  } catch {
    // Emscripten may propagate exit codes as exceptions
  }
  process.exitCode = undefined;

  const full = outputs.join("\n");
  const stderr = stderrOutput.join("\n");

  console.log(`test:retrobasic: ${file} (${interpreter})`);

  check("produced output", outputs.length > 0);

  for (const pattern of expect) {
    check(`output matches ${pattern}`, pattern.test(full));
  }

  console.log("");
}

console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
