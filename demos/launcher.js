import {
  games,
  interpreters,
  resolveSelection,
  selectionUrl,
} from "./catalog.js";

const output = document.getElementById("output");
const input = document.getElementById("input");
const cursor = document.getElementById("cursor");
const screen = document.getElementById("screen");
const terminalHeader = document.getElementById("terminal-header");
const gameSelect = document.getElementById("game-select");
const interpreterSelect = document.getElementById("interpreter-select");
const status = document.getElementById("status");

const selection = resolveSelection(window.location.search);
const canonicalUrl = selectionUrl(window.location, selection);
if (canonicalUrl.href !== window.location.href) {
  window.history.replaceState(null, "", canonicalUrl);
}

document.title = `${selection.game.title} — Basicade`;
terminalHeader.textContent = `${selection.game.title} — ${selection.interpreter.name}`;

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
const maxInputLength = 254;

function appendOutput(text) {
  terminalText += text;
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

function applicationUrl(path) {
  return new URL(
    path,
    new URL(import.meta.env.BASE_URL, window.location.origin),
  );
}

async function start() {
  if (!window.crossOriginIsolated) {
    throw new Error(
      "Interactive input needs cross-origin isolation (COOP and COEP headers).",
    );
  }

  const response = await fetch(applicationUrl(selection.game.sourcePath));
  if (!response.ok) {
    throw new Error(
      `Could not load ${selection.game.sourcePath} (${response.status}).`,
    );
  }

  const source = await response.text();
  const buffer = new SharedArrayBuffer(4);
  const keys = new SharedArrayBuffer(256);
  const sharedBuffer = new Int32Array(buffer);
  const sharedKeys = new Uint8Array(keys);
  Atomics.store(sharedBuffer, 0, 0);
  Atomics.store(sharedKeys, 0, 0);

  worker = new Worker(new URL("./runner.worker.js", import.meta.url), {
    type: "module",
  });

  worker.onmessage = ({ data }) => {
    if (data.type === "READY") {
      worker.postMessage({
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
      waitingForInput = true;
      render();
    } else if (data.type === "ERROR") {
      setStatus(data.message);
      waitingForInput = false;
      render();
    } else if (data.type === "EXIT") {
      appendOutput("\n*** SYSTEM OFFLINE ***\n");
      waitingForInput = false;
      render();
      worker.terminate();
    }
  };

  worker.onerror = (event) =>
    setStatus(event.message || "The interpreter worker failed.");
  worker.postMessage({
    type: "INIT",
    wasmUrl: applicationUrl(selection.interpreter.wasmPath).href,
  });

  document.addEventListener("keydown", (event) => {
    if (!waitingForInput) return;

    if (event.key === "Enter") {
      event.preventDefault();
      const value = `${currentInput}\n`;
      terminalText += value;
      currentInput = "";
      waitingForInput = false;
      render();

      for (let index = 0; index < value.length; index++) {
        Atomics.store(sharedKeys, 2 + index, value.charCodeAt(index));
      }
      Atomics.store(sharedKeys, 0, value.length);
      Atomics.store(sharedBuffer, 0, 1);
      Atomics.notify(sharedBuffer, 0, 1);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      currentInput = currentInput.slice(0, -1);
      render();
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      if (currentInput.length < maxInputLength) {
        currentInput += event.key.toUpperCase();
      }
      render();
    }
  });
}

start().catch((error) => {
  setStatus(error.message);
  appendOutput(`\n*** ${error.message} ***\n`);
});
