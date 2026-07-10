import createModule from "../wasm/bwbasic.js";

let sharedBuffer;
let sharedKeys;

self.onmessage = async (e) => {
    if (e.data.type === "START") {
        const { source, buffer, keys } = e.data;
        sharedBuffer = new Int32Array(buffer);
        sharedKeys = new Uint8Array(keys);

        let hasProvidedInput = false;

        const mod = await createModule({
            noInitialRun: true,
            print: (text) => {
                self.postMessage({ type: "STDOUT", text });
            },
            stdin: () => {
                // Read the current input length from index 0
                let inputLength = Atomics.load(sharedKeys, 0);

                if (inputLength === 0) {
                    if (hasProvidedInput) {
                        // We already returned a line, but the TTY read loop wants
                        // more to fill its buffer. Signal end-of-batch to let the
                        // current read complete with the data we already gave it.
                        hasProvidedInput = false;
                        return null;
                    }
                    // Genuinely waiting for the user to type something
                    self.postMessage({ type: "REQUEST_INPUT" });
                    Atomics.wait(sharedBuffer, 0, 0);
                    Atomics.store(sharedBuffer, 0, 0);
                    inputLength = Atomics.load(sharedKeys, 0);
                    if (inputLength === 0) return null;
                }

                // Mark that we've given data this round, and clear consumed length
                hasProvidedInput = true;
                Atomics.store(sharedKeys, 0, 0);

                // Build the complete input string
                const chars = [];
                for (let i = 0; i < inputLength; i++) {
                    chars.push(String.fromCharCode(Atomics.load(sharedKeys, 2 + i)));
                }

                return chars.join("");
            }
        });

        mod.FS.writeFile("/oregon.bas", source);
        mod.callMain(["/oregon.bas"]);

        self.postMessage({ type: "EXIT" });
    }
};
