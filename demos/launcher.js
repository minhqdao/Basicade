// The Basicade demo launcher. Everything the user touches -- the
// transcript, the command line (IMEs included), scrolling, the soft
// keyboard -- lives in the terminal-shell npm package. This launcher is
// the host glue only: the game/interpreter catalog, the interpreter worker
// lifecycle (which writes the fetched BASIC source into the virtual FS),
// cross-origin isolation recovery, status text, and restart.

import {
  games,
  interpreters,
  resolveSelection,
  selectionUrl,
} from "./catalog.js";
import {
  createKeysBuffer,
  createTerminalShell,
  maxInputLength,
  runnerCommand,
  runnerEvent,
  sanitizeTerminalOutput,
  writeInputLine,
} from "terminal-shell";

const output = /** @type {HTMLElement} */ (document.getElementById("output"));
const input = /** @type {HTMLElement} */ (document.getElementById("input"));
const cursor = /** @type {HTMLElement} */ (document.getElementById("cursor"));
const screen = /** @type {HTMLElement} */ (document.getElementById("screen"));
const terminalContainer = /** @type {HTMLElement} */ (
  document.getElementById("terminal-container")
);
const gameSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("game-select")
);
const interpreterSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("interpreter-select")
);
const status = /** @type {HTMLElement} */ (document.getElementById("status"));
const restartButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("restart-game")
);
const terminalInput = /** @type {HTMLInputElement} */ (
  document.getElementById("terminal-input")
);
const main = /** @type {HTMLElement | null} */ (document.querySelector("main"));

const applicationBase = new URL(
  import.meta.env.BASE_URL,
  window.location.origin,
).pathname;

const selection = resolveSelection(
  window.location.search,
  window.location.pathname,
);
const canonicalUrl = selectionUrl(window.location, selection, applicationBase);
if (canonicalUrl.href !== window.location.href) {
  window.history.replaceState(null, "", canonicalUrl);
}

document.title = `${selection.game.title} — Basicade`;

/** @type {Map<string, import("./catalog-schema.js").CatalogGame[]>} */
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
  window.location.assign(
    selectionUrl(window.location, { game, interpreter }, applicationBase),
  );
});

interpreterSelect.addEventListener("change", () => {
  window.location.assign(
    selectionUrl(
      window.location,
      {
        game: selection.game,
        interpreter: interpreters[interpreterSelect.value],
      },
      applicationBase,
    ),
  );
});

// --- the terminal shell -------------------------------------------------------
//
// The hidden field owns the text; the shell reads it, echoes it, and
// normalizes the submitted line to printable ASCII exactly once (its
// toEngineText policy) before onLine hands it to the interpreter buffer.
// The output transform sanitizes only: BASIC prints significant leading
// spaces, so the FORTRAN-flavored leading-space strip stays off.

const shell = createTerminalShell({
  screen,
  output,
  inputLine: input,
  cursor,
  field: terminalInput,
  container: terminalContainer,
  insetTarget: main,
  nativeLogDataset: "basicadeLog",
  maxInputLength,
  transformOutput: (text) => sanitizeTerminalOutput(text),
  onLine: handleLine,
  onFirstOutput() {
    // The first interpreter output means the whole module graph loaded and
    // the worker is streaming: disarm index.html's boot guard (recovery
    // reload + watchdog) so it can never misfire later in the session.
    document.documentElement.dataset.basicadeBootDone = "1";
    try {
      sessionStorage.removeItem("basicade-module-reload");
    } catch {
      // Private modes can throw on storage access; the guard is
      // session-scoped anyway and loses relevance after boot.
    }
  },
});

/** @param {string} message */
function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

// --- worker lifecycle ----------------------------------------------------------

/** @type {Worker | undefined} */
let worker;
/** @type {number | undefined} */
let workerStartupTimer;
let runId = 0;
let lastWorkerMessageAt = 0;
/** @type {number | undefined} */
let inputResponseTimer;
const maxStartupRetries = 2;
const sourceFetchTimeoutMs = 10_000;
// A healthy boot finishes in ~1-2s, so 8s per attempt is still ~4-8x
// headroom while keeping the worst case bounded: 3 attempts x 8s + 0.6s +
// 1.2s backoff ~= 26s. Transient fetch blips (worker script, wasm glue,
// wasm binary, game source) are the common intermittent boot failure; an
// immediate retry often re-hits the same blip, so retries back off
// linearly (600ms, then 1200ms) to let the network settle. Restart/pagehide
// bumps runId, which aborts a pending retry via the currentRunId check.
const workerStartupTimeoutMs = 8_000;
const startupRetryBaseDelayMs = 600;
// The interpreter answers a submitted line within a few milliseconds; the
// worker is also the only thing that can ever clear the "waiting for input"
// state, so a silent gap after submitting means iOS suspended the process
// mid-flight.
const inputResponseTimeoutMs = 2_500;

/**
 * The interpreter accepted the line: write it into the shared buffer and
 * arm the response watchdog. (Shell submit -> onLine.)
 * @param {string} value the normalized line including its trailing "\n"
 */
function handleLine(value) {
  // Safety net for a worker that vanished without a pagehide/pageshow cycle
  // (iOS reclaiming a suspended tab): the submit would otherwise vanish into
  // dead shared memory. The watchdog below covers the slower variant where
  // the worker dies after the line was queued.
  if (!worker || !sharedBuffer || !sharedKeys) {
    restartGame();
    return;
  }

  writeInputLine(sharedKeys, value);
  Atomics.store(sharedBuffer, 0, 1);
  Atomics.notify(sharedBuffer, 0, 1);

  // A worker killed while the page was hidden (pagehide terminated it, or iOS
  // reclaimed it) never consumes the line and never reports anything: without
  // this watch the terminal would look frozen with a keyboard open.
  const submittedAt = Date.now();
  clearTimeout(inputResponseTimer);
  inputResponseTimer = setTimeout(() => {
    inputResponseTimer = undefined;
    if (lastWorkerMessageAt < submittedAt) restartGame();
  }, inputResponseTimeoutMs);
}

function releaseWorker() {
  terminalInput.blur();
  clearTimeout(workerStartupTimer);
  workerStartupTimer = undefined;
  clearTimeout(inputResponseTimer);
  inputResponseTimer = undefined;
  if (worker) {
    worker.terminate();
    worker = undefined;
  }
  sharedBuffer = undefined;
  sharedKeys = undefined;
}

// --- cross-origin isolation ----------------------------------------------------

/** @type {Int32Array | undefined} */
let sharedBuffer;
/** @type {Uint8Array | undefined} */
let sharedKeys;
const isolationReloadKey = "basicade-isolation-reload";

/** @param {string} path */
function applicationUrl(path) {
  return new URL(
    path,
    new URL(import.meta.env.BASE_URL, window.location.origin),
  );
}

// Service-worker isolation can be late rather than impossible -- first
// visits, and private tabs (iOS 17+ supports them, iOS earlier does not)
// claim the page a beat after our check can wait. One guarded reload per
// session is therefore the recovery for EVERY dead end below: if a fresh
// document is isolated, it plays; if it still can't become isolated, the
// guard is spent, the second pass answers false, and the friendly
// message is honest. coi performs its own reloads (first-visit, COEP
// degrade); both systems guard with sessionStorage, so the page reloads
// at most once per system per session -- never in a loop.
function tryRecoveryReload() {
  if (sessionStorage.getItem(isolationReloadKey)) return false;
  sessionStorage.setItem(isolationReloadKey, "1");
  window.location.reload();
  return undefined;
}

async function ensureCrossOriginIsolation() {
  if (window.crossOriginIsolated) {
    sessionStorage.removeItem(isolationReloadKey);
    return true;
  }

  if (typeof SharedArrayBuffer === "undefined") {
    // An app's built-in browser (Instagram, TikTok, ...) -- on iOS always
    // a WKWebView, which cannot run the interpreter's engine no matter
    // what the page asks for. The only helpful message is the one-action
    // fix.
    const ua = navigator.userAgent;
    const mobile =
      /iP(hone|ad|od)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
      /Android/.test(ua);
    const iosDevice =
      /iP(hone|ad|od)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    throw new Error(
      mobile
        ? iosDevice
          ? "This game can't run in this app's browser. Tap the ⋯ or share icon and choose “Open in Safari” to play."
          : "This game can't run in this app's browser. Open the ⋮ menu and choose “Open in Chrome” to play."
        : "This game needs a newer browser. Open it in the latest Chrome, Safari, Firefox, or Edge to play.",
    );
  }

  if (!navigator.serviceWorker) return false;

  // serviceWorker.ready stays pending when no registration can exist; if
  // it never lands this waits briefly (private tabs can claim late rather
  // than never) and then gets the one guarded reload, same as the
  // not-yet-controlling case below.
  const ready = await Promise.race([
    navigator.serviceWorker.ready.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!ready) return tryRecoveryReload();

  if (navigator.serviceWorker.controller) {
    // coi is serving this page and handles its own degradation. Give its
    // in-flight reload a moment to navigate before declaring failure.
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem(isolationReloadKey);
      return true;
    }
    return tryRecoveryReload();
  }

  // Registered but not controlling yet: reload once so coi's fetch
  // handler can add the isolation headers to the page itself.
  return tryRecoveryReload();
}

// --- boot ------------------------------------------------------------------------

async function start() {
  const currentRunId = ++runId;
  const isIsolated = await ensureCrossOriginIsolation();
  if (currentRunId !== runId) return;
  if (isIsolated === undefined) return;
  if (!isIsolated) {
    throw new Error(
      "This game couldn't load. This usually means you're in a " +
        "private tab — reopen the link in a normal tab, or try reloading.",
    );
  }

  const source = await fetchGameSource(currentRunId);
  if (currentRunId !== runId) return;
  const buffer = new SharedArrayBuffer(4);
  const keys = createKeysBuffer();
  sharedBuffer = new Int32Array(buffer);
  sharedKeys = new Uint8Array(keys);
  Atomics.store(sharedBuffer, 0, 0);
  Atomics.store(sharedKeys, 0, 0);

  launchWorker(source, buffer, keys, currentRunId);
}

/**
 * @param {number} currentRunId
 * @param {number} [attempt]
 * @returns {Promise<string>}
 */
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

/**
 * @param {string} source
 * @param {SharedArrayBuffer} buffer
 * @param {SharedArrayBuffer} keys
 * @param {number} currentRunId
 * @param {number} [attempt]
 */
function scheduleStartupRetry(source, buffer, keys, currentRunId, attempt) {
  const nextAttempt = (attempt ?? 0) + 1;
  const delayMs = startupRetryBaseDelayMs * nextAttempt;
  setTimeout(() => {
    if (currentRunId !== runId) return;
    launchWorker(source, buffer, keys, currentRunId, nextAttempt);
  }, delayMs);
}

/**
 * @param {string} source
 * @param {SharedArrayBuffer} buffer
 * @param {SharedArrayBuffer} keys
 * @param {number} currentRunId
 * @param {number} [attempt]
 */
function launchWorker(source, buffer, keys, currentRunId, attempt = 0) {
  if (currentRunId !== runId) return;

  /** @type {Worker} */
  let activeWorker;
  try {
    activeWorker = new Worker(new URL("./runner.worker.js", import.meta.url), {
      type: "module",
    });
  } catch (error) {
    if (attempt < maxStartupRetries) {
      scheduleStartupRetry(source, buffer, keys, currentRunId, attempt);
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

  /** @param {string} message */
  function handleStartupFailure(message) {
    if (worker !== activeWorker) return;
    clearTimeout(workerStartupTimer);
    workerStartupTimer = undefined;
    activeWorker.terminate();
    worker = undefined;

    if (currentRunId !== runId) return;
    if (!hasStarted && attempt < maxStartupRetries) {
      scheduleStartupRetry(source, buffer, keys, currentRunId, attempt);
      return;
    }

    setStatus(message);
    shell.endInput();
    releaseWorker();
  }

  workerStartupTimer = setTimeout(() => {
    handleStartupFailure("The interpreter worker timed out during startup.");
  }, workerStartupTimeoutMs);

  activeWorker.onmessage = (event) => {
    if (worker !== activeWorker) return;
    lastWorkerMessageAt = Date.now();
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
      shell.appendOutput(data.text);
    } else if (data.type === "REQUEST_INPUT") {
      shell.beginInput(); // Focus the command field; a tap opens the keyboard on mobile
    } else if (data.type === "ERROR") {
      if (!hasStarted) {
        handleStartupFailure(data.message);
        return;
      }
      setStatus(data.message);
      shell.endInput();
      releaseWorker();
    } else if (data.type === "EXIT") {
      shell.appendOutput("\n*** SYSTEM OFFLINE ***\n");
      shell.endInput();
      shell.flushOutputRender();
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

// iOS fires pagehide when a tab is backgrounded, and the worker either dies
// with the suspended process or is terminated here. Any restore path (plain
// foregrounding, bfcache) then resumes into a dead game, so remember that a
// live game was lost and restart on the next pageshow.
let interruptedByPageHide = false;

window.addEventListener("pagehide", () => {
  interruptedByPageHide = Boolean(worker);
  releaseWorker();
});

window.addEventListener("pageshow", () => {
  if (!interruptedByPageHide) return;
  interruptedByPageHide = false;
  restartGame();
});

/** @param {Error} error */
function reportStartError(error) {
  releaseWorker();
  shell.reset("");
  setStatus(error.message);
}

function restartGame() {
  runId += 1;
  interruptedByPageHide = false;
  releaseWorker();
  shell.reset("LOADING...\n");
  setStatus("");
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
