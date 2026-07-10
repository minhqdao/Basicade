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
                // If we have exhausted our current input buffer line, wait for the main thread
                if (keyIndex >= sharedKeys[0]) {
                    self.postMessage({ type: "REQUEST_INPUT" });

                    // Force worker thread to sleep synchronously until main thread increments index 1
                    Atomics.wait(sharedBuffer, 0, 0);

                    // Reset the index once woke up
                    keyIndex = 0;
                    Atomics.store(sharedBuffer, 0, 0); // Reset wait flag
                }

                const charCode = sharedKeys[2 + keyIndex];
                keyIndex++;
                return charCode;
            }
        });

        // Load the code and boot!
        mod.FS.writeFile("/oregon.bas", source);
        mod.callMain(["/oregon.bas"]);

        self.postMessage({ type: "EXIT" });
    }
};
