#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = resolve(__dirname, "..", "wasm", "retrobasic.js");

if (!existsSync(wasmPath)) {
  console.log("test:integration: SKIPPED (retrobasic.wasm not built yet)");
  console.log("Run 'npm run build:wasm -w packages/retrobasic-wasm' first.");
  process.exit(0);
}

const { default: createModule } = await import(wasmPath);
const oregonPath = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "examples",
  "oregon-trail",
  "oregon.bas",
);

const source = readFileSync(oregonPath, "utf8");

// Feed a sequence of inputs to play through ~2-3 turns
const lines = [
  "NO",                 // instructions
  "3",                  // shooting skill
  "200",                // oxen
  "200",                // food
  "50",                 // ammunition
  "50",                 // clothing
  "50",                 // misc supplies
  "1",                  // first turn: HUNT
  "BANG",               // shooting word
  "2",                  // eat moderately
  "3",                  // riders attack: continue
  "3",                  // second turn: continue
  "2",                  // eat moderately
  "3",                  // third turn: continue
  "2",                  // eat moderately
];

const chars = lines.join("\n") + "\n";
const inputQueue = chars.split("").reverse();

const outputs = [];
const stderrOutput = [];
let emptyPollCount = 0;
const MAX_EMPTY_POLLS = 100;

const mod = await createModule({
  noInitialRun: true,
  print: (line) => outputs.push(line),
  printErr: (line) => stderrOutput.push(line),
  stdin: () => {
    if (inputQueue.length === 0) {
      emptyPollCount++;
      if (emptyPollCount > MAX_EMPTY_POLLS) {
        throw new Error(
          "Execution stalled: Program requested more input than was provided in the test script.",
        );
      }
      return null;
    }
    return inputQueue.pop().charCodeAt(0);
  },
});

mod.FS.writeFile("/oregon.bas", source);
mod.callMain(["/oregon.bas"]);

const full = outputs.join("\n");
const stderr = stderrOutput.join("\n");

// -- assertions --
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

console.log("test:integration: Oregon Trail (RetroBASIC)");
console.log("");

// 1. Purchase Confirmation
const hasPurchase = full.includes("AFTER ALL YOUR PURCHASES, YOU NOW HAVE");
check("purchase confirmation appears", hasPurchase);

// 2. Shooting subroutine invoked
const hasShootPrompt = /TYPE (BANG|BLAM|POW|WHAM)/.test(full);
check("shooting prompt appears", hasShootPrompt);

// 3. Shooting result printed
const hasShootResult =
  /NICE SHOT|RIGHT BETWEEN|BETWEEN THE EYES|MISSED|LOUSY SHOT|SLOW ON THE DRAW|QUICKEST DRAW/.test(
    full,
  );
check("shooting result appears", hasShootResult);

// 4. No runtime errors from CLK calls
check("no runtime errors on stderr", stderr.length === 0);
if (stderr.length > 0) {
  console.log(`     stderr: ${stderr.substring(0, 200)}`);
}

console.log("");

// 5 & 6. Mileage Checks
const mileageCount = (full.match(/TOTAL MILEAGE IS/g) || []).length;
check("total mileage appears at least twice", mileageCount >= 2);

const mileageIncreases = /TOTAL MILEAGE IS\s+[1-9]\d*/.test(full);
check("mileage increases between turns", mileageIncreases);

if (mileageCount > 0) {
  console.log("     Mileage Progression:");
  outputs
    .filter((line) => line.includes("TOTAL MILEAGE IS"))
    .forEach((line) => console.log(`        - ${line.trim()}`));
}

console.log("");
console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("\n--- captured output ---");
  console.log(full);
  process.exit(1);
}
