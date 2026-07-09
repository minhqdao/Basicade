#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createModule from "../wasm/bwbasic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const oregonPath = resolve(__dirname, "..", "examples", "oregon-trail", "oregon.bas");

const source = readFileSync(oregonPath, "utf8");

// Feed a sequence of inputs to play through ~2-3 turns
const lines = [
  "NO",                 // instructions
  "3",                  // shooting skill (fair to middlin')
  "200",                // oxen
  "200",                // food
  "50",                 // ammunition
  "50",                 // clothing
  "50",                 // misc supplies
  "2",                  // first turn: continue (hunt/continue)
  "2",                  // eat moderately
  "3",                  // riders attack: continue
  "3",                  // second turn: continue (fort/hunt/continue)
  "2",                  // eat moderately
  "3",                  // third turn: continue
  "2",                  // eat moderately
];

const chars = lines.join("\n") + "\n";
const inputQueue = chars.split("").reverse();

const outputs = [];
let emptyPollCount = 0;
const MAX_EMPTY_POLLS = 100;

const mod = await createModule({
  noInitialRun: true,
  print: (line) => outputs.push(line),
  printErr: (line) => console.warn(`[WASM STDERR] ${line}`), // Catch runtime panics
  stdin: () => {
    if (inputQueue.length === 0) {
      emptyPollCount++;
      if (emptyPollCount > MAX_EMPTY_POLLS) {
        throw new Error("Execution stalled: Program requested more input than was provided in the test script.");
      }
      return null;
    }
    return inputQueue.pop().charCodeAt(0);
  },
});

// Write to virtual root using POSIX paths to ensure cross-platform compatibility
mod.FS.writeFile("/oregon.bas", source);
mod.callMain(["/oregon.bas"]);

const full = outputs.join("\n");

// — assertions —
let passed = 0;
let failed = 0;

function check(label, ok) {
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

console.log("smoke-test: Oregon Trail");
console.log("");

check("purchase confirmation appears", full.includes("AFTER ALL YOUR PURCHASES, YOU NOW HAVE"));
check("total mileage appears at least twice", (full.match(/TOTAL MILEAGE IS/g) || []).length >= 2);
check("mileage increases between turns", /TOTAL MILEAGE IS\s+[1-9]\d*/.test(full));

console.log("");
console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("\n--- captured output ---");
  console.log(full);
  process.exit(1);
}
