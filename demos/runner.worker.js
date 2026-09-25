// @ts-check

import { runnerCommand, runnerEvent } from "terminal-shell/protocol";

/**
 * @typedef {object} EmscriptenModule
 * @property {(args: string[]) => void} callMain
 * @property {{ init: Function, writeFile: (path: string, data: string) => void }} FS
 */

/** @type {((options: object) => Promise<EmscriptenModule>) | undefined} */
let createModule;

/** @param {object} message */
function send(message) {
  self.postMessage(runnerEvent(message));
}

self.onmessage = async (event) => {
  try {
    const data = runnerCommand(event.data);
    if (data.type === "INIT") {
      const mod = await import(/* @vite-ignore */ data.wasmUrl);
      createModule = mod.default;
      send({ type: "READY" });
      return;
    }

    if (data.type !== "START" || !createModule) return;

    // This worker only runs interpreted programs: the fetched BASIC source
    // is written into the virtual FS. Narrow the START union (whose other
    // shape boots a compiled module with no source) before touching the
    // interpreter-only fields below.
    if (!("filename" in data)) return;

    const sharedBuffer = new Int32Array(data.buffer);
    const sharedKeys = new Uint8Array(data.keys);
    let keyIndex = 0;
    let awaitingEOF = false;
    let stdoutBuffer = "";

    function flushStdout() {
      if (!stdoutBuffer) return;
      send({ type: "STDOUT", text: stdoutBuffer });
      stdoutBuffer = "";
    }

    const module = await createModule({
      noInitialRun: true,
      preRun: (/** @type {EmscriptenModule} */ emscriptenModule) => {
        emscriptenModule.FS.init(
          () => {
            flushStdout();
            let inputLength = Atomics.load(sharedKeys, 0);

            if (awaitingEOF) {
              awaitingEOF = false;
              keyIndex = 0;
              Atomics.store(sharedKeys, 0, 0);
              return null;
            }

            if (keyIndex >= inputLength) {
              send({ type: "REQUEST_INPUT" });
              Atomics.wait(sharedBuffer, 0, 0);
              Atomics.store(sharedBuffer, 0, 0);
              keyIndex = 0;
              inputLength = Atomics.load(sharedKeys, 0);
            }

            const charCode = Atomics.load(sharedKeys, 2 + keyIndex);
            keyIndex++;
            if (keyIndex >= inputLength) awaitingEOF = true;
            return charCode;
          },
          (/** @type {number} */ charCode) => {
            const character = String.fromCharCode(charCode);
            if (character === "\n") {
              send({ type: "STDOUT", text: `${stdoutBuffer}\n` });
              stdoutBuffer = "";
            } else {
              stdoutBuffer += character;
            }
          },
          (/** @type {number} */ charCode) =>
            console.warn(String.fromCharCode(charCode)),
        );
      },
    });

    module.FS.writeFile(`/${data.filename}`, data.source);
    send({ type: "STARTED" });
    module.callMain([`/${data.filename}`]);
    flushStdout();
    send({ type: "EXIT" });
    self.close();
  } catch (error) {
    send({
      type: "ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    self.close();
  }
};
