const output = document.getElementById("output");
const input = document.getElementById("input");
const cursor = document.getElementById("cursor");
const screen = document.getElementById("screen");

// Initialize buffers explicitly
const buffer = new SharedArrayBuffer(4);
const keys = new SharedArrayBuffer(256);
const sharedBuffer = new Int32Array(buffer);
const sharedKeys = new Uint8Array(keys);

let terminalText = "";
let currentInput = "";
let waitingForInput = false;
let cursorVisible = false;

// Ensure memory is completely cleared out at start
Atomics.store(sharedBuffer, 0, 0);
Atomics.store(sharedKeys, 0, 0);

const response = await fetch("../examples/oregon-trail/oregon.bas");
const source = await response.text();

const cursorTimer = setInterval(() => {
  cursorVisible = !cursorVisible;
  render();
}, 500);

const worker = new Worker("./worker.js", { type: "module" });

worker.postMessage({ type: "START", source, buffer, keys });

worker.onmessage = (e) => {
  if (e.data.type === "STDOUT") {
    appendOutput(e.data.text);
  } else if (e.data.type === "REQUEST_INPUT") {
    currentInput = "";
    waitingForInput = true;
    cursorVisible = true;
    render();
  } else if (e.data.type === "EXIT") {
    appendOutput("\n*** SYSTEM OFFLINE ***");
    waitingForInput = false;
    clearInterval(cursorTimer);
    worker.terminate();
  }
};

function appendOutput(text) {
  terminalText += text;
  render();
  screen.scrollTop = screen.scrollHeight;
}

function render() {
  output.textContent = terminalText;
  input.textContent = waitingForInput ? currentInput : "";
  cursor.textContent = waitingForInput && cursorVisible ? "_" : "";
}

document.addEventListener("keydown", (e) => {
  if (!waitingForInput) {
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();

    const value = currentInput + "\n";

    terminalText += value;
    currentInput = "";
    waitingForInput = false;
    render();

    for (let i = 0; i < value.length; i++) {
      Atomics.store(sharedKeys, 2 + i, value.charCodeAt(i));
    }

    Atomics.store(sharedKeys, 0, value.length);

    Atomics.store(sharedBuffer, 0, 1);
    Atomics.notify(sharedBuffer, 0, 1);

    return;
  }

  if (e.key === "Backspace") {
    e.preventDefault();

    currentInput = currentInput.slice(0, -1);
    render();
    return;
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();

    currentInput += e.key.toUpperCase();
    render();
  }
});
