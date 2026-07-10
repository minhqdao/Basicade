const history = document.getElementById("history");
const inputField = document.getElementById("input-field");
const screen = document.getElementById("screen");

// 1. Set up shared memory
// Array layout: 
// sharedBuffer[0] -> used for Atomics signaling
// sharedKeys[0]   -> length of the inputted string
// sharedKeys[2+]  -> ASCII character values
const buffer = new SharedArrayBuffer(4);
const keys = new SharedArrayBuffer(256);
const sharedBuffer = new Int32Array(buffer);
const sharedKeys = new Uint8Array(keys);

// 2. Fetch original BASIC source code
const response = await fetch("./oregon.bas");
const source = await response.text();

// 3. Start our background worker thread
const worker = new Worker("worker.js", { type: "module" });

worker.postMessage({
    type: "START",
    source,
    buffer,
    keys
});

// Write stdout lines to screen
worker.onmessage = (e) => {
    if (e.data.type === "STDOUT") {
        appendLine(e.data.text);
    } else if (e.data.type === "REQUEST_INPUT") {
        inputField.disabled = false;
        inputField.focus();
    } else if (e.data.type === "EXIT") {
        appendLine("\n*** SYSTEM OFFLINE ***");
        inputField.disabled = true;
    }
};

function appendLine(text) {
    const div = document.createElement("div");
    div.textContent = text;
    history.appendChild(div);
    screen.scrollTop = screen.scrollHeight; // Auto-scroll
}

// 4. Capture keypresses and send them to the compiler
inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const value = inputField.value.toUpperCase() + "\n";
        appendLine("? " + inputField.value); // Echo local input
        inputField.value = "";
        inputField.disabled = true;

        // Load user input string into shared keys structure
        sharedKeys[0] = value.length;
        for (let i = 0; i < value.length; i++) {
            sharedKeys[2 + i] = value.charCodeAt(i);
        }

        // Wake up the worker thread
        Atomics.store(sharedBuffer, 0, 1);
        Atomics.notify(sharedBuffer, 0, 1);
    }
});
