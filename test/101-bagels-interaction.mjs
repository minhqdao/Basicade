import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { runBasic } from "../packages/retrobasic-wasm/dist/index.js";

async function runWorker(scenario) {
  const output = [];
  const originalSource = readFileSync(
    "examples/101-basic-computer-games/bagels.bas",
    "utf8",
  );
  const source =
    scenario === "REPLAY"
      ? originalSource
          .replace(
            '210 PRINT:PRINT "O.K.  I HAVE A NUMBER IN MIND."',
            '210 G=G+1:PRINT:PRINT "O.K.  I HAVE A NUMBER IN MIND.":IF G=2 THEN 760',
          )
          .replace(
            "240 INPUT A$",
            "240 A$=CHR$(A(1)+48)+CHR$(A(2)+48)+CHR$(A(3)+48)",
          )
          .replace("999 END", '760 PRINT "REACHED SECOND GAME"\n999 END')
      : originalSource.replace(
          "240 INPUT A$",
          '240 PRINT "REACHED FIRST GUESS":END',
        );
  assert.notEqual(source, originalSource, "Bagels guess line was instrumented");

  await runBasic({
    source,
    stdin: scenario === "REPLAY" ? ["NO", "YES"] : [scenario],
    onStdout: (line) => output.push(line),
    onStderr: (line) => output.push(line),
  });

  const transcript = output.join("\n");
  if (scenario === "REPLAY") {
    assert.match(transcript, /YOU GOT IT!!!/);
    assert.match(transcript, /PLAY AGAIN \(YES OR NO\)/);
    assert.equal(
      transcript.match(/O\.K\.  I HAVE A NUMBER IN MIND\./g)?.length,
      2,
    );
    assert.match(transcript, /REACHED SECOND GAME/);
    return;
  }

  assert.match(transcript, /O\.K\.  I HAVE A NUMBER IN MIND\./);
  assert.match(transcript, /GUESS #\s*1/);
  assert.match(transcript, /REACHED FIRST GUESS/);
  if (scenario === "YES") {
    assert.match(transcript, /I AM THINKING OF A THREE-DIGIT NUMBER/);
  } else {
    assert.doesNotMatch(transcript, /I AM THINKING OF A THREE-DIGIT NUMBER/);
  }
}

function testScenario(scenario) {
  return new Promise((resolveTest, rejectTest) => {
    const child = spawn(process.execPath, [
      fileURLToPath(import.meta.url),
      "--worker",
      scenario,
    ]);
    let errors = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 5_000);

    child.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    child.on("error", rejectTest);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      try {
        assert.equal(timedOut, false, `${scenario} path timed out`);
        assert.equal(signal, null, `${scenario} path was terminated`);
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
  await Promise.all([
    testScenario("NO"),
    testScenario("YES"),
    testScenario("REPLAY"),
  ]);
  console.log("test: 101 Bagels starts and replays with RetroBASIC");
}
