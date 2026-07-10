const history = document.getElementById("history");
const inputField = document.getElementById("input-field");
const screen = document.getElementById("screen");

// Initialize buffers explicitly
const buffer = new SharedArrayBuffer(4);
const keys = new SharedArrayBuffer(256);
const sharedBuffer = new Int32Array(buffer);
const sharedKeys = new Uint8Array(keys);

// Ensure memory is completely cleared out at start
Atomics.store(sharedBuffer, 0, 0);
Atomics.store(sharedKeys, 0, 0);

const response = await fetch("../examples/oregon-trail/oregon.bas");
const source = await response.text();

const worker = new Worker("./worker.js", { type: "module" });

worker.postMessage({ type: "START", source, buffer, keys });

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
    screen.scrollTop = screen.scrollHeight;
}

inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const value = inputField.value.toUpperCase() + "\n";
        appendLine("? " + inputField.value);
        inputField.value = "";
        inputField.disabled = true;

        // 1. Atomically fill characters into safe buffer locations
        for (let i = 0; i < value.length; i++) {
            Atomics.store(sharedKeys, 2 + i, value.charCodeAt(i));
        }

        // 2. Set total string length at index 0 explicitly
        Atomics.store(sharedKeys, 0, value.length);

        // 3. Flip control flag and notify the background worker to wake up
        Atomics.store(sharedBuffer, 0, 1);
        Atomics.notify(sharedBuffer, 0, 1);
    }
});
