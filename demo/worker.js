import createModule from "../wasm/bwbasic.js";

let sharedBuffer;
let sharedKeys;

self.onmessage = async (e) => {
  if (e.data.type === "START") {
    const { source, buffer, keys } = e.data;
    sharedBuffer = new Int32Array(buffer);
    sharedKeys = new Uint8Array(keys);

    let keyIndex = 0;
    let awaitingEOF = false;
    let stdoutBuffer = "";

    // Flush unflushed characters (like prompts without newlines) to the UI
    function flushStdout() {
      if (stdoutBuffer.length > 0) {
        self.postMessage({ type: "STDOUT", text: stdoutBuffer });
        stdoutBuffer = "";
      }
    }

    const mod = await createModule({
      noInitialRun: true,
      preRun: (m) => {
        // Override standard I/O to gain character-by-character control
        m.FS.init(
          // 1. Custom STDIN
          () => {
            // Push any invisible prompts to the screen right before we wait
            flushStdout();

            let inputLength = Atomics.load(sharedKeys, 0);

            // Break Emscripten's greedy TTY read loop so it returns the line to C
            if (awaitingEOF) {
              awaitingEOF = false;
              keyIndex = 0;
              Atomics.store(sharedKeys, 0, 0);
              return null;
            }

            // Block and wait for the main thread if buffer is empty
            if (keyIndex >= inputLength) {
              self.postMessage({ type: "REQUEST_INPUT" });
              Atomics.wait(sharedBuffer, 0, 0);
              Atomics.store(sharedBuffer, 0, 0);
              keyIndex = 0;
              inputLength = Atomics.load(sharedKeys, 0);
            }

            const charCode = Atomics.load(sharedKeys, 2 + keyIndex);
            keyIndex++;

            if (keyIndex >= inputLength) {
              awaitingEOF = true;
            }

            return charCode;
          },
          // 2. Custom STDOUT (Char by Char)
          (charCode) => {
            const ch = String.fromCharCode(charCode);
            if (ch === "\n") {
              self.postMessage({
                type: "STDOUT",
                text: stdoutBuffer + "\n",
              });
              stdoutBuffer = "";
            } else {
              stdoutBuffer += ch;
            }
          },
          // 3. Custom STDERR
          (charCode) => {
            console.warn(String.fromCharCode(charCode));
          },
        );
      },
    });

    mod.FS.writeFile("/oregon.bas", source);
    mod.callMain(["/oregon.bas"]);

    self.postMessage({ type: "EXIT" });
    self.close();
  }
};
