import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const repository = resolve(import.meta.dirname, "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "basicade-package-test-"));
const npmCache = join(temporaryRoot, "npm-cache");
const packages = ["bwbasic-wasm", "retrobasic-wasm"];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

try {
  for (const packageName of packages) {
    const packDirectory = join(temporaryRoot, "tarballs");
    await mkdir(packDirectory, { recursive: true });
    const packResult = JSON.parse(
      run(npm, [
        "pack",
        "--json",
        "--pack-destination",
        packDirectory,
        "--cache",
        npmCache,
        "--workspace",
        `packages/${packageName}`,
      ]),
    );
    assert.equal(packResult.length, 1, `${packageName} produced one tarball`);

    const consumer = join(temporaryRoot, `consumer-${packageName}`);
    await mkdir(consumer);
    await writeFile(
      join(consumer, "package.json"),
      JSON.stringify({ private: true, type: "module" }),
    );

    const tarball = join(packDirectory, packResult[0].filename);
    run(
      npm,
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--cache",
        npmCache,
        tarball,
      ],
      { cwd: consumer },
    );
    await writeFile(
      join(consumer, "run.mjs"),
      `import { runBasic } from ${JSON.stringify(packageName)};
const output = [];
const exitCode = await runBasic({
  source: '10 PRINT "PACKED PACKAGE WORKS"\\n20 END',
  onStdout: (line) => output.push(line),
});
if (exitCode !== 0 || !output.join('\\n').includes('PACKED PACKAGE WORKS')) {
  throw new Error('packed package consumer failed');
}
`,
    );
    run(process.execPath, ["run.mjs"], { cwd: consumer });
    console.log(`test: installed and ran packed ${packageName}`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
