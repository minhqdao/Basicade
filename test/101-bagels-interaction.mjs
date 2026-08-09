import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { runBasic } from "../packages/retrobasic-wasm/dist/index.js";

async function runWorker(answer) {
  const output = [];
  const originalSource = readFileSync(
    "examples/101-basic-computer-games/bagels.bas",
    "utf8",
  );
  const source = originalSource.replace(
    "240 INPUT A$",
    '240 PRINT "REACHED FIRST GUESS":END',
  );
  assert.notEqual(source, originalSource, "Bagels guess line was instrumented");

  await runBasic({
    source,
    stdin: [answer],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  assert.match(transcript, /O\.K\.  I HAVE A NUMBER IN MIND\./);
  assert.match(transcript, /GUESS #\s*1/);
  assert.match(transcript, /REACHED FIRST GUESS/);
  if (answer === "YES") {
    assert.match(transcript, /I AM THINKING OF A THREE-DIGIT NUMBER/);
  } else {
    assert.doesNotMatch(transcript, /I AM THINKING OF A THREE-DIGIT NUMBER/);
  }
}

function testAnswer(answer) {
  return new Promise((resolveTest, rejectTest) => {
    const child = spawn(process.execPath, [
      fileURLToPath(import.meta.url),
      "--worker",
      answer,
    ]);
    let errors = "";
    const timeout = setTimeout(() => child.kill(), 2_000);

    child.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    child.on("error", rejectTest);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      try {
        assert.equal(signal, null, `${answer} path timed out`);
        assert.equal(code, 0, errors);
        resolveTest();
      } catch (error) {
        rejectTest(error);
      }
    });
  });
}

if (process.argv[2] === "--worker") {
  await runWorker(process.argv[3]);
} else {
  await Promise.all([testAnswer("NO"), testAnswer("YES")]);
  console.log("test: 101 Bagels reaches its first guess with RetroBASIC");
}
