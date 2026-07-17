const terminal = document.getElementById("terminal");
const inputField = document.getElementById("input-field");
const screen = document.getElementById("screen");

// Initialize buffers explicitly
const buffer = new SharedArrayBuffer(4);
const keys = new SharedArrayBuffer(256);
const sharedBuffer = new Int32Array(buffer);
const sharedKeys = new Uint8Array(keys);

let terminalText = "";
let currentInput = "";
let waitingForInput = false;
let cursorVisible = true;

// Ensure memory is completely cleared out at start
Atomics.store(sharedBuffer, 0, 0);
Atomics.store(sharedKeys, 0, 0);

const response = await fetch("../examples/oregon-trail/oregon.bas");
const source = await response.text();

const worker = new Worker("./worker.js", { type: "module" });

worker.postMessage({ type: "START", source, buffer, keys });
inputField.focus();

document.addEventListener(
  "mousedown",
  (e) => {
    if (e.target !== inputField) {
      e.preventDefault();
      inputField.focus();
    }
  },
  true,
);

worker.onmessage = (e) => {
  if (e.data.type === "STDOUT") {
    appendOutput(e.data.text);
  } else if (e.data.type === "REQUEST_INPUT") {
    // BwBASIC prints a standalone "?" before every INPUT.
    // Remove it because the browser handles input natively.
    removeTrailingQuestionMark();

    inputField.value = "";
    currentInput = "";
    waitingForInput = true;
    render();
    inputField.focus();
  } else if (e.data.type === "EXIT") {
    appendOutput("\n*** SYSTEM OFFLINE ***");
  }
};

function appendOutput(text) {
  terminalText += text;
  render();
}

function removeTrailingQuestionMark() {
  terminalText = terminalText.replace(/\?\s*$/, "");
  render();
}

function render() {
  let text = terminalText;

  if (waitingForInput) {
    text += currentInput;

    if (cursorVisible) {
      text += "_";
    }
  }

  terminal.textContent = text;
  screen.scrollTop = screen.scrollHeight;
}

inputField.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !waitingForInput) {
    return;
  }

  const enteredText = currentInput;
  const value = enteredText + "\n";

  terminalText += value;
  currentInput = "";
  inputField.value = "";
  waitingForInput = false;
  render();

  // 1. Atomically fill characters into safe buffer locations
  for (let i = 0; i < value.length; i++) {
    Atomics.store(sharedKeys, 2 + i, value.charCodeAt(i));
  }

  // 2. Set total string length at index 0 explicitly
  Atomics.store(sharedKeys, 0, value.length);

  // 3. Flip control flag and notify the background worker to wake up
  Atomics.store(sharedBuffer, 0, 1);
  Atomics.notify(sharedBuffer, 0, 1);
});

inputField.addEventListener("input", () => {
  if (!waitingForInput) {
    return;
  }

  currentInput = inputField.value.toUpperCase();
  render();
});

setInterval(() => {
  cursorVisible = !cursorVisible;
  render();
}, 500);
