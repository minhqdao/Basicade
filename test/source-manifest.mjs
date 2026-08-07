import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const collection = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../examples/basic-computer-games",
);
const manifestText = await readFile(
  resolve(collection, "SOURCE-MANIFEST.sha256"),
  "utf8",
);
const manifestEntries = manifestText
  .trim()
  .split("\n")
  .map((line) => {
    const match = line.match(/^([a-f0-9]{64})  ([^/]+\.bas)$/);
    assert.ok(match, `invalid source-manifest entry: ${line}`);
    return [match[2], match[1]];
  });
const manifest = new Map(manifestEntries);
assert.equal(
  manifest.size,
  manifestEntries.length,
  "the source manifest does not contain duplicate filenames",
);
const sources = (await readdir(collection))
  .filter((file) => file.endsWith(".bas"))
  .sort();

assert.deepEqual(
  [...manifest.keys()].sort(),
  sources,
  "the source manifest covers every BASIC listing exactly once",
);

for (const source of sources) {
  const contents = await readFile(resolve(collection, source));
  const checksum = createHash("sha256").update(contents).digest("hex");
  assert.equal(checksum, manifest.get(source), `${basename(source)} checksum`);
}

console.log(`test: verified provenance checksums for ${sources.length} BASIC listings`);
