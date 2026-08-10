import {
  games,
  interpreters,
  resolveSelection,
  selectionUrl,
} from "./catalog.js";
import { sanitizeTerminalOutput } from "./terminal-output.js";
import { isTouchPointer, moveInputCaretToEnd } from "./terminal-input.js";
import {
  isTerminalScrolledToBottom,
  scrollTerminalToBottom,
  terminalActiveLineOverlap,
  terminalHeightAboveViewport,
} from "./terminal-scroll.js";
import { hasTextSelection, updateTextContent } from "./terminal-selection.js";
import { runnerCommand, runnerEvent } from "./runner-protocol.js";

const output = document.getElementById("output");
const input = document.getElementById("input");
const cursor = document.getElementById("cursor");
const screen = document.getElementById("screen");
const terminalContainer = document.getElementById("terminal-container");
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

let terminalText = "LOADING...\n";
let currentInput = "";
let waitingForInput = false;
let hasReceivedFirstOutput = false;
let isCursorActive = false;
let worker;
let workerStartupTimer;
let runId = 0;
const maxInputLength = 254;
const maxStartupRetries = 1;
const sourceFetchTimeoutMs = 10_000;
const workerStartupTimeoutMs = 15_000;

function appendOutput(text) {
  if (!hasReceivedFirstOutput) {
    terminalText = "";
    hasReceivedFirstOutput = true;
  }

  terminalText += sanitizeTerminalOutput(text);
  render();
  scrollTerminalToBottom(screen);
}

function render() {
  updateTextContent(output, terminalText);
  updateTextContent(input, waitingForInput ? currentInput : "");

  updateTextContent(cursor, waitingForInput ? "_" : "");

  const shouldShowCursor =
    waitingForInput && document.activeElement === terminalInput;

  if (shouldShowCursor) {
    if (!isCursorActive) {
      // Transitioning from inactive to active: restart animation
      isCursorActive = true;
      cursor.style.visibility = "visible";
      cursor.classList.remove("blinking");
      void cursor.offsetWidth; // Force reflow to restart CSS animation
      cursor.classList.add("blinking");
    } else {
      // Already active, just ensure it's visible
      cursor.style.visibility = "visible";
    }
  } else {
    // Inactive or not waiting for input
    isCursorActive = false;
    cursor.style.visibility = "hidden";
  }
}

function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function releaseWorker() {
  terminalInput.blur();
  clearTimeout(workerStartupTimer);
  workerStartupTimer = undefined;
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
  scrollTerminalToBottom(screen);

  for (let index = 0; index < value.length; index++) {
    Atomics.store(sharedKeys, 2 + index, value.charCodeAt(index));
  }
  Atomics.store(sharedKeys, 0, value.length);
  Atomics.store(sharedBuffer, 0, 1);
  Atomics.notify(sharedBuffer, 0, 1);
}

function focusTerminalInput() {
  if (!waitingForInput || document.activeElement === terminalInput) return;
  terminalInput.focus({ preventScroll: true });
  moveInputCaretToEnd(terminalInput);
}

function keepActiveInputVisible() {
  if (waitingForInput && document.activeElement === terminalInput) {
    scrollTerminalToBottom(screen);
  }
}

function handleTerminalClick() {
  // A click is also fired after dragging to select text. Refocusing the hidden
  // input here would collapse the range the user just created.
  if (!hasTextSelection(window.getSelection())) focusTerminalInput();
}

let touchMouseEventPending = false;

function handleTerminalPointerDown(event) {
  touchMouseEventPending = isTouchPointer(event);
  if (touchMouseEventPending) focusTerminalInput();
}

function handleTerminalMouseDown(event) {
  const followsTouch = touchMouseEventPending;
  touchMouseEventPending = false;
  const targetsTerminalBackground =
    event.target === screen || event.target === terminalContainer;

  // Mobile browsers synthesize mouse events after a touch, while desktop
  // browsers move focus when the blank terminal background is clicked. Avoid
  // both redundant blur/refocus cycles. Mouse selection still works because
  // mousedown events that target terminal text keep their default behavior.
  if (
    document.activeElement === terminalInput &&
    (followsTouch || targetsTerminalBackground)
  ) {
    event.preventDefault();
  }
}

// Mobile Safari can resize and pan its visual viewport at different points in
// the keyboard animation. Constrain the terminal itself instead of scrolling
// the page, which avoids exposing Safari's blank root scroll area.
const keyboardViewport = window.visualViewport ?? window;
const usesMobilePointer = window.matchMedia("(pointer: coarse)");
let previousViewportWidth = keyboardViewport.width ?? window.innerWidth;
let keyboardResizeFrame;
let constrainedTerminalHeight;
let keyboardClosedViewportHeight =
  keyboardViewport.height ?? window.innerHeight;
let keyboardCheckTimers = [];

function usesTouchInput() {
  return usesMobilePointer.matches || navigator.maxTouchPoints > 0;
}

function clearKeyboardConstraint() {
  terminalContainer.classList.remove("keyboard-constrained");
  terminalContainer.style.removeProperty("--keyboard-terminal-height");
  constrainedTerminalHeight = undefined;
}

function cancelKeyboardChecks() {
  if (keyboardResizeFrame) cancelAnimationFrame(keyboardResizeFrame);
  keyboardResizeFrame = undefined;
  for (const timer of keyboardCheckTimers) clearTimeout(timer);
  keyboardCheckTimers = [];
}

function constrainTerminalAboveKeyboard() {
  keyboardResizeFrame = undefined;
  if (!waitingForInput || document.activeElement !== terminalInput) return;

  const visibleBottom = keyboardViewport.offsetTop + keyboardViewport.height;
  const overlap = terminalActiveLineOverlap(terminalInput, visibleBottom);
  if (!constrainedTerminalHeight && overlap <= 0) return;

  const availableTerminalHeight = terminalHeightAboveViewport(
    terminalContainer,
    visibleBottom,
  );
  const terminalHeight = constrainedTerminalHeight
    ? Math.min(constrainedTerminalHeight, availableTerminalHeight)
    : availableTerminalHeight;
  if (terminalHeight === constrainedTerminalHeight) return;

  const shouldKeepPromptPinned =
    constrainedTerminalHeight === undefined ||
    isTerminalScrolledToBottom(screen);
  terminalContainer.style.setProperty(
    "--keyboard-terminal-height",
    `${terminalHeight}px`,
  );
  terminalContainer.classList.add("keyboard-constrained");
  constrainedTerminalHeight = terminalHeight;

  if (shouldKeepPromptPinned) {
    scrollTerminalToBottom(screen);
    keyboardResizeFrame = requestAnimationFrame(() => {
      keyboardResizeFrame = undefined;
      scrollTerminalToBottom(screen);
    });
  }
}

function queueKeyboardConstraintCheck() {
  if (!usesTouchInput() || keyboardViewport === window) return;
  if (keyboardResizeFrame) cancelAnimationFrame(keyboardResizeFrame);
  keyboardResizeFrame = requestAnimationFrame(() => {
    keyboardResizeFrame = requestAnimationFrame(constrainTerminalAboveKeyboard);
  });
}

function handleKeyboardViewportResize() {
  if (!usesTouchInput() || keyboardViewport === window) {
    keepActiveInputVisible();
    return;
  }

  const height = keyboardViewport.height;
  const width = keyboardViewport.width;
  const widthChanged = Math.abs(width - previousViewportWidth) >= 24;
  previousViewportWidth = width;

  if (widthChanged) {
    clearKeyboardConstraint();
    keyboardClosedViewportHeight = height;
    return;
  }
  if (
    keyboardClosedViewportHeight &&
    (height >= keyboardClosedViewportHeight - 80 ||
      height >= window.innerHeight - 80)
  ) {
    clearKeyboardConstraint();
    return;
  }
  queueKeyboardConstraintCheck();
}

keyboardViewport.addEventListener("resize", handleKeyboardViewportResize);
keyboardViewport.addEventListener("scroll", queueKeyboardConstraintCheck);

terminalInput.addEventListener("focus", () => {
  render();
  keepActiveInputVisible();
  keyboardClosedViewportHeight = Math.max(
    keyboardClosedViewportHeight ?? 0,
    keyboardViewport.height ?? window.innerHeight,
  );
  previousViewportWidth = keyboardViewport.width ?? window.innerWidth;
  keyboardCheckTimers = [50, 300, 700].map((delay) =>
    setTimeout(queueKeyboardConstraintCheck, delay),
  );
});
terminalInput.addEventListener("blur", () => {
  cancelKeyboardChecks();
  clearKeyboardConstraint();
  keyboardClosedViewportHeight = Math.max(
    keyboardClosedViewportHeight,
    keyboardViewport.height ?? window.innerHeight,
  );
  render();
});

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

  // Convert to upper case for display only; never rewrite the native value here.
  currentInput = terminalInput.value.toUpperCase();
  moveInputCaretToEnd(terminalInput);
  render();
  scrollTerminalToBottom(screen);
});

// 2. Handle desktop 'Enter' key press
terminalInput.addEventListener("keydown", (event) => {
  if (waitingForInput && event.key === "Enter") {
    event.preventDefault();
    submitInput();
  }
});

terminalContainer.addEventListener("pointerdown", handleTerminalPointerDown);
terminalContainer.addEventListener("mousedown", handleTerminalMouseDown);
terminalContainer.addEventListener("click", handleTerminalClick);

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

  const source = await fetchGameSource(currentRunId);
  if (currentRunId !== runId) return;
  const buffer = new SharedArrayBuffer(4);
  const keys = new SharedArrayBuffer(256);
  sharedBuffer = new Int32Array(buffer);
  sharedKeys = new Uint8Array(keys);
  Atomics.store(sharedBuffer, 0, 0);
  Atomics.store(sharedKeys, 0, 0);

  launchWorker(source, buffer, keys, currentRunId);
}

async function fetchGameSource(currentRunId, attempt = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sourceFetchTimeoutMs);

  try {
    const response = await fetch(applicationUrl(selection.game.sourcePath), {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if (currentRunId !== runId) throw error;
    if (attempt < maxStartupRetries) {
      return fetchGameSource(currentRunId, attempt + 1);
    }
    const reason =
      error instanceof Error && error.name !== "AbortError"
        ? `: ${error.message}`
        : " (timed out)";
    throw new Error(`Could not load ${selection.game.sourcePath}${reason}.`, {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function launchWorker(source, buffer, keys, currentRunId, attempt = 0) {
  if (currentRunId !== runId) return;

  let activeWorker;
  try {
    activeWorker = new Worker(new URL("./runner.worker.js", import.meta.url), {
      type: "module",
    });
  } catch (error) {
    if (attempt < maxStartupRetries) {
      launchWorker(source, buffer, keys, currentRunId, attempt + 1);
      return;
    }
    throw error;
  }
  worker = activeWorker;
  let hasStarted = false;

  function markInterpreterStarted() {
    hasStarted = true;
    clearTimeout(workerStartupTimer);
    workerStartupTimer = undefined;
  }

  function handleStartupFailure(message) {
    if (worker !== activeWorker) return;
    clearTimeout(workerStartupTimer);
    workerStartupTimer = undefined;
    activeWorker.terminate();
    worker = undefined;

    if (currentRunId !== runId) return;
    if (!hasStarted && attempt < maxStartupRetries) {
      launchWorker(source, buffer, keys, currentRunId, attempt + 1);
      return;
    }

    setStatus(message);
    waitingForInput = false;
    render();
    releaseWorker();
  }

  workerStartupTimer = setTimeout(() => {
    handleStartupFailure("The interpreter worker timed out during startup.");
  }, workerStartupTimeoutMs);

  activeWorker.onmessage = (event) => {
    if (worker !== activeWorker) return;
    const data = runnerEvent(event.data);
    if (data.type === "READY") {
      activeWorker.postMessage(
        runnerCommand({
          type: "START",
          source,
          filename: selection.game.sourcePath.split("/").pop(),
          buffer,
          keys,
        }),
      );
    } else if (data.type === "STARTED") {
      markInterpreterStarted();
    } else if (data.type === "STDOUT") {
      appendOutput(data.text);
    } else if (data.type === "REQUEST_INPUT") {
      currentInput = "";
      terminalInput.value = "";
      waitingForInput = true;
      render();
      focusTerminalInput(); // Auto-focus input field and pull up mobile keyboard
    } else if (data.type === "ERROR") {
      if (!hasStarted) {
        handleStartupFailure(data.message);
        return;
      }
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
    event.preventDefault();
    handleStartupFailure(event.message || "The interpreter worker failed.");
  };
  activeWorker.postMessage(
    runnerCommand({
      type: "INIT",
      wasmUrl: applicationUrl(selection.interpreter.wasmPath).href,
    }),
  );
}

window.addEventListener("pagehide", releaseWorker, { once: true });

function reportStartError(error) {
  releaseWorker();
  setStatus(error.message);
  terminalText = "";
  hasReceivedFirstOutput = false;
  render();
}

function restartGame() {
  runId += 1;
  releaseWorker();
  terminalText = "LOADING...\n";
  hasReceivedFirstOutput = false;
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
