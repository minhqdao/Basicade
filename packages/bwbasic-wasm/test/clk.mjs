#!/usr/bin/env node

/**
 * WASM CLK function test
 * Validates CLK(0), CLK(X), and CLK$ work correctly in the WASM build.
 * Tests the same patterns used by the Oregon Trail shooting subroutine.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createModule from "../wasm/bwbasic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testPath = resolve(__dirname, "basic", "test_clk.bas");
const source = readFileSync(testPath, "utf8");

const inputQueue = ["\n"].reverse();
const outputs = [];
const stderrOutput = [];
let emptyPollCount = 0;
const MAX_EMPTY_POLLS = 200;

const mod = await createModule({
  noInitialRun: true,
  print: (line) => outputs.push(line),
  printErr: (line) => stderrOutput.push(line),
  stdin: () => {
    if (inputQueue.length === 0) {
      emptyPollCount++;
      if (emptyPollCount > MAX_EMPTY_POLLS) {
        throw new Error("Execution stalled: no more input available");
      }
      return null;
    }
    return inputQueue.pop().charCodeAt(0);
  },
});

mod.FS.writeFile("/test_clk.bas", source);
mod.callMain(["/test_clk.bas"]);

const full = outputs.join("\n");
const stderr = stderrOutput.join("\n");

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

console.log("test: CLK functions (WASM)");
console.log("");

// Check all 25 tests passed
const allPassed = full.includes("ALL TESTS PASSED");
check("all 25 tests pass in WASM", allPassed);

// Count pass/fail from output
const passCount = (full.match(/PASS:/g) || []).length;
const failCount = (full.match(/FAIL:/g) || []).length;
console.log(
  `     (got ${passCount} passes, ${failCount} fails from BASIC test suite)`,
);
check("zero failures in BASIC output", failCount === 0);
check("got 25 test assertions", passCount === 25);

// Check CLK(0) returns reasonable value
const clkMatch = full.match(/1\.4 CLK\(0\) raw:\s+([\d.]+)/);
if (clkMatch) {
  const clkVal = parseFloat(clkMatch[1]);
  check(`CLK(0) returned valid value: ${clkVal}`, clkVal >= 0 && clkVal < 24);
} else {
  check("CLK(0) raw value printed", false);
}

// Check CLK$ format
const clkStrMatch = full.match(/CLK\$ has colons/);
check("CLK$ format validated (HH:MM:SS)", !!clkStrMatch);

// Check elapsed time works
const elapsedMatch = full.match(/elapsed sec >= 0/);
check("elapsed time measurement works", !!elapsedMatch);

// Check Oregon Trail pattern
const otMatch = full.match(/Oregon Trail formula/);
check("Oregon Trail shooting pattern works", !!otMatch);

// Check shooting scores printed
const scores = full.match(/Score:\s+([-\d.]+)/g);
if (scores) {
  check(`shooting scores computed: ${scores.join(", ")}`, scores.length >= 3);
} else {
  check("shooting scores printed", false);
}

// Check for runtime errors in stderr
check("no runtime errors on stderr", stderr.length === 0);
if (stderr.length > 0) {
  console.log(`     stderr: ${stderr.substring(0, 200)}`);
}

console.log("");
console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("\n--- captured output ---");
  console.log(full);
  process.exit(1);
}
