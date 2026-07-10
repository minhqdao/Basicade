import createModule from "../wasm/bwbasic.js";

let sharedBuffer;
let sharedKeys;

self.onmessage = async (e) => {
    if (e.data.type === "START") {
        const { source, buffer, keys } = e.data;
        sharedBuffer = new Int32Array(buffer);
        sharedKeys = new Uint8Array(keys);

        let keyIndex = 0;

        const mod = await createModule({
            noInitialRun: true,
            print: (text) => {
                self.postMessage({ type: "STDOUT", text });
            },
            stdin: () => {
                const inputLength = Atomics.load(sharedKeys, 0);

                if (keyIndex >= inputLength) {
                    if (keyIndex > 0) {
                        // We already returned characters for this batch, but the
                        // read loop wants more to fill its buffer. Signal EOF to
                        // let the current read complete with what we gave it.
                        keyIndex = 0;
                        Atomics.store(sharedKeys, 0, 0);
                        return null;
                    }
                    // No input yet — block and wait for the user to type
                    self.postMessage({ type: "REQUEST_INPUT" });
                    keyIndex = 0;
                    Atomics.wait(sharedBuffer, 0, 0);
                    Atomics.store(sharedBuffer, 0, 0);
                }

                const charCode = Atomics.load(sharedKeys, 2 + keyIndex);
                keyIndex++;
                return charCode;
            }
        });

        mod.FS.writeFile("/oregon.bas", source);
        mod.callMain(["/oregon.bas"]);

        self.postMessage({ type: "EXIT" });
    }
};
