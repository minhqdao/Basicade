import {
  games,
  interpreters,
  resolveSelection,
  selectionUrl,
} from "./catalog.js";
import { sanitizeTerminalOutput } from "./terminal-output.js";

const output = document.getElementById("output");
const input = document.getElementById("input");
const cursor = document.getElementById("cursor");
const screen = document.getElementById("screen");
const gameSelect = document.getElementById("game-select");
const interpreterSelect = document.getElementById("interpreter-select");
const status = document.getElementById("status");
const restartButton = document.getElementById("restart-game");
const terminalInput = document.getElementById("terminal-input");

const selection = resolveSelection(
  window.location.search,
  window.location.pathname,
);
const canonicalUrl = selectionUrl(window.location, selection);
if (canonicalUrl.href !== window.location.href) {
  window.history.replaceState(null, "", canonicalUrl);
}

document.title = `${selection.game.title} — Basicade`;

const gameCollections = new Map();
for (const game of Object.values(games)) {
  const collection = gameCollections.get(game.collection) ?? [];
  collection.push(game);
  gameCollections.set(game.collection, collection);
}

for (const [collection, collectionGames] of gameCollections) {
  const group = document.createElement("optgroup");
  group.label = collection;
  for (const game of collectionGames) {
    group.append(
      new Option(game.title, game.id, false, game.id === selection.game.id),
    );
  }
  gameSelect.append(group);
}

for (const interpreterId of selection.game.interpreters) {
  const interpreter = interpreters[interpreterId];
  interpreterSelect.add(
    new Option(
      interpreter.name,
      interpreter.id,
      false,
      interpreter.id === selection.interpreter.id,
    ),
  );
}

gameSelect.addEventListener("change", () => {
  const game = games[gameSelect.value];
  const interpreter = game.interpreters.includes(selection.interpreter.id)
    ? selection.interpreter
    : interpreters[game.interpreters[0]];
  window.location.assign(selectionUrl(window.location, { game, interpreter }));
});

interpreterSelect.addEventListener("change", () => {
  window.location.assign(
    selectionUrl(window.location, {
      game: selection.game,
      interpreter: interpreters[interpreterSelect.value],
    }),
  );
});

let terminalText = "";
let currentInput = "";
let waitingForInput = false;
let worker;
let runId = 0;
const maxInputLength = 254;

function appendOutput(text) {
  terminalText += sanitizeTerminalOutput(text);
  render();
  screen.scrollTop = screen.scrollHeight;
}

function render() {
  output.textContent = terminalText;
  input.textContent = waitingForInput ? currentInput : "";
  cursor.textContent = waitingForInput ? "_" : "";
}

function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function releaseWorker() {
  terminalInput.blur();
  if (worker) {
    worker.terminate();
    worker = undefined;
  }
  sharedBuffer = undefined;
  sharedKeys = undefined;
}

function submitInput() {
  const value = `${currentInput}\n`;
  terminalText += value;
  currentInput = "";
  terminalInput.value = "";
  waitingForInput = false;
  render();

  for (let index = 0; index < value.length; index++) {
    Atomics.store(sharedKeys, 2 + index, value.charCodeAt(index));
  }
  Atomics.store(sharedKeys, 0, value.length);
  Atomics.store(sharedBuffer, 0, 1);
  Atomics.notify(sharedBuffer, 0, 1);
}

function focusTerminalInput() {
  if (waitingForInput) terminalInput.focus({ preventScroll: true });
}

// 1. Handle live typing, backspacing, and mobile "Return/Go" keys
terminalInput.addEventListener("input", (event) => {
  if (!waitingForInput) return;

  // Mobile keyboards often insert a newline (\n) or trigger insertLineBreak instead of an 'Enter' keydown event
  if (
    event.inputType === "insertLineBreak" ||
    terminalInput.value.includes("\n")
  ) {
    terminalInput.value = terminalInput.value.replace(/\n/g, "");
    submitInput();
    return;
  }

  // Enforce max length on the input field
  if (terminalInput.value.length > maxInputLength) {
    terminalInput.value = terminalInput.value.slice(0, maxInputLength);
  }

  // Convert to upper case for display only. DO NOT set terminalInput.value = currentInput here!
  currentInput = terminalInput.value.toUpperCase();
  render();
});

// 2. Handle desktop 'Enter' key press
terminalInput.addEventListener("keydown", (event) => {
  if (waitingForInput && event.key === "Enter") {
    event.preventDefault();
    submitInput();
  }
});

screen.addEventListener("click", focusTerminalInput);

let sharedBuffer;
let sharedKeys;
const isolationReloadKey = "basicade-isolation-reload";

function applicationUrl(path) {
  return new URL(
    path,
    new URL(import.meta.env.BASE_URL, window.location.origin),
  );
}

async function ensureCrossOriginIsolation() {
  if (window.crossOriginIsolated) {
    sessionStorage.removeItem(isolationReloadKey);
    return true;
  }

  if (!navigator.serviceWorker) return false;

  try {
    await navigator.serviceWorker.ready;
  } catch {
    return false;
  }

  if (!sessionStorage.getItem(isolationReloadKey)) {
    sessionStorage.setItem(isolationReloadKey, "1");
    window.location.reload();
    return undefined;
  }

  return false;
}

async function start() {
  const currentRunId = ++runId;
  const isIsolated = await ensureCrossOriginIsolation();
  if (currentRunId !== runId) return;
  if (isIsolated === undefined) return;
  if (!isIsolated) {
    throw new Error(
      "Interactive input needs cross-origin isolation (COOP and COEP headers).",
    );
  }

  const response = await fetch(applicationUrl(selection.game.sourcePath));
  if (currentRunId !== runId) return;
  if (!response.ok) {
    throw new Error(
      `Could not load ${selection.game.sourcePath} (${response.status}).`,
    );
  }

  const source = await response.text();
  if (currentRunId !== runId) return;
  const buffer = new SharedArrayBuffer(4);
  const keys = new SharedArrayBuffer(256);
  sharedBuffer = new Int32Array(buffer);
  sharedKeys = new Uint8Array(keys);
  Atomics.store(sharedBuffer, 0, 0);
  Atomics.store(sharedKeys, 0, 0);

  const activeWorker = new Worker(
    new URL("./runner.worker.js", import.meta.url),
    {
      type: "module",
    },
  );
  worker = activeWorker;

  activeWorker.onmessage = ({ data }) => {
    if (worker !== activeWorker) return;
    if (data.type === "READY") {
      activeWorker.postMessage({
        type: "START",
        source,
        filename: selection.game.sourcePath.split("/").pop(),
        buffer,
        keys,
      });
    } else if (data.type === "STDOUT") {
      appendOutput(data.text);
    } else if (data.type === "REQUEST_INPUT") {
      currentInput = "";
      terminalInput.value = "";
      waitingForInput = true;
      render();
      focusTerminalInput(); // Auto-focus input field and pull up mobile keyboard
    } else if (data.type === "ERROR") {
      setStatus(data.message);
      waitingForInput = false;
      render();
      releaseWorker();
    } else if (data.type === "EXIT") {
      appendOutput("\n*** SYSTEM OFFLINE ***\n");
      waitingForInput = false;
      render();
      releaseWorker();
    }
  };

  activeWorker.onerror = (event) => {
    if (worker !== activeWorker) return;
    setStatus(event.message || "The interpreter worker failed.");
    waitingForInput = false;
    render();
    releaseWorker();
  };
  activeWorker.postMessage({
    type: "INIT",
    wasmUrl: applicationUrl(selection.interpreter.wasmPath).href,
  });
}

window.addEventListener("pagehide", releaseWorker, { once: true });

function reportStartError(error) {
  releaseWorker();
  setStatus(error.message);
}

function restartGame() {
  runId += 1;
  releaseWorker();
  terminalText = "";
  currentInput = "";
  waitingForInput = false;
  setStatus("");
  render();
  screen.scrollTop = 0;
  startGame();
}

restartButton.addEventListener("click", restartGame);

function startGame() {
  const expectedRunId = runId + 1;
  start().catch((error) => {
    if (expectedRunId === runId) reportStartError(error);
  });
}

startGame();
