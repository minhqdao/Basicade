let createModule;

self.onmessage = async ({ data }) => {
  try {
    if (data.type === "INIT") {
      const mod = await import(/* @vite-ignore */ data.wasmUrl);
      createModule = mod.default;
      self.postMessage({ type: "READY" });
      return;
    }

    if (data.type !== "START" || !createModule) return;

    const sharedBuffer = new Int32Array(data.buffer);
    const sharedKeys = new Uint8Array(data.keys);
    let keyIndex = 0;
    let awaitingEOF = false;
    let stdoutBuffer = "";

    function flushStdout() {
      if (!stdoutBuffer) return;
      self.postMessage({ type: "STDOUT", text: stdoutBuffer });
      stdoutBuffer = "";
    }

    const module = await createModule({
      noInitialRun: true,
      preRun: (emscriptenModule) => {
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
              self.postMessage({ type: "REQUEST_INPUT" });
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
          (charCode) => {
            const character = String.fromCharCode(charCode);
            if (character === "\n") {
              self.postMessage({ type: "STDOUT", text: `${stdoutBuffer}\n` });
              stdoutBuffer = "";
            } else {
              stdoutBuffer += character;
            }
          },
          (charCode) => console.warn(String.fromCharCode(charCode)),
        );
      },
    });

    module.FS.writeFile(`/${data.filename}`, data.source);
    module.callMain([`/${data.filename}`]);
    flushStdout();
    self.postMessage({ type: "EXIT" });
    self.close();
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
