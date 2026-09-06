import { expect, test } from "@playwright/test";
import process from "node:process";

const terminalInput = "#terminal-input";

async function openLauncher(page) {
  await page.goto("oregon-trail/");
  await expect(page.locator("#output")).not.toHaveText("LOADING...\n", {
    timeout: 15_000,
  });
  await expect
    .poll(() => page.evaluate(() => window.crossOriginIsolated))
    .toBe(true);
  await expect(page.locator(terminalInput)).toBeFocused();
}

test("all routes use the same available site icons", async ({ page }) => {
  const iconPaths = [
    "/Basicade/favicon.svg?v=5",
    "/Basicade/favicon.png?v=5",
    "/Basicade/favicon.ico?v=5",
    "/Basicade/safari-pinned-tab.svg?v=5",
    "/Basicade/apple-touch-icon.png?v=5",
  ];

  for (const route of [
    "",
    "oregon-trail/",
    "oregon-trail/?interpreter=retrobasic",
    "101-1-check/",
  ]) {
    await page.goto(route);
    await expect
      .poll(async () => {
        try {
          return await page.evaluate(() => window.crossOriginIsolated);
        } catch {
          return false;
        }
      })
      .toBe(true);
    const hrefs = await page.locator('link[rel*="icon"]').evaluateAll((links) =>
      links.map((link) => `${new URL(link.href).pathname}${new URL(link.href).search}`),
    );
    expect(hrefs).toEqual(iconPaths);
  }

  for (const path of iconPaths) {
    const response = await page.request.get(path);
    expect(response.ok(), `${path} is available`).toBe(true);
  }
});

test("service worker establishes isolation and leaves the game ready", async ({
  page,
}) => {
  await openLauncher(page);

  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker?.controller)),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("basicade-isolation-reload"),
      ),
    )
    .toBe(null);
  await expect(page.locator("#status")).toBeHidden();
});

test("typing, backspace, display capitalization, and Enter advance input", async ({
  page,
}) => {
  await openLauncher(page);

  await page.locator(terminalInput).pressSequentially("noq");
  await page.locator(terminalInput).press("Backspace");

  await expect(page.locator(terminalInput)).toHaveValue("no");
  await expect(page.locator("#input")).toHaveText("NO");

  await page.locator(terminalInput).press("Enter");

  await expect(page.locator("#output")).toContainText("NO");
  await expect(page.locator(terminalInput)).toHaveValue("");
  await expect(page.locator(terminalInput)).toBeFocused();
  await expect(page.locator("#status")).toBeHidden();
});

test("composed input echoes faithfully and submits the normalized line", async ({
  page,
}) => {
  await openLauncher(page);

  // What the Vietnamese Telex IME leaves in the field for "look": the
  // second "o" was consumed to compose ô over the first. The echo must
  // show the composed character and the field must keep it verbatim --
  // stripping it deleted the base letter with it, the original
  // vanishing-character bug.
  await page.locator(terminalInput).fill("loôk");
  await expect(page.locator("#input")).toHaveText("LOÔK");
  await expect(page.locator(terminalInput)).toHaveValue("loôk");

  await page.locator(terminalInput).press("Enter");

  await expect(page.locator("#output")).toContainText("LOOK");
  await expect(page.locator(terminalInput)).toHaveValue("");
  await expect(page.locator("#status")).toBeHidden();
});

test("IME composition owns the caret; plain typing re-pins it", async ({
  page,
}) => {
  await openLauncher(page);

  // A selection write under an active composition corrupts the IME's
  // marked range -- every update then re-inserts the whole pending
  // composition (AÁASASS...) instead of replacing. The synthetic events
  // below drive the launcher's own composition state machine in the real
  // browser: no caret write between compositionstart and compositionend.
  const { plainWrites, composingWrites, states, committed, totalWrites } =
    await page.locator(terminalInput).evaluate((input) => {
      let caretWrites = 0;
      const native = input.setSelectionRange.bind(input);
      input.setSelectionRange = (...arguments_) => {
        caretWrites += 1;
        return native(...arguments_);
      };
      const echo = document.getElementById("input");
      const states = [];
      const type = (value) => {
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        states.push(echo.textContent);
      };

      type("OK"); // plain typing re-pins the caret (append-only contract)
      const plainWrites = caretWrites;

      input.dispatchEvent(new Event("compositionstart", { bubbles: true }));
      for (const marked of ["a", "á", "ás", "áss", "ásss"]) type(marked);
      const composingWrites = caretWrites - plainWrites;

      input.dispatchEvent(new Event("compositionend", { bubbles: true }));
      return {
        plainWrites,
        composingWrites,
        states,
        committed: echo.textContent,
        totalWrites: caretWrites,
      };
    });

  expect(plainWrites).toBe(1);
  expect(composingWrites).toBe(0);
  expect(states).toEqual(["OK", "A", "Á", "ÁS", "ÁSS", "ÁSSS"]);
  expect(totalWrites).toBe(2);
  expect(committed).toBe("ÁSSS");
});

test("Enter inside a composition commits it; the next Enter submits", async ({
  page,
}) => {
  await openLauncher(page);

  await page.locator(terminalInput).evaluate((input) => {
    input.value = "loôk";
    input.dispatchEvent(new Event("compositionstart", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // The committing Enter in Android's legacy shape (keyCode 229).
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, bubbles: true }),
    );
  });
  await expect(page.locator("#output")).not.toContainText("LOOK");

  await page.locator(terminalInput).evaluate((input) => {
    input.dispatchEvent(new Event("compositionend", { bubbles: true }));
  });
  await page.locator(terminalInput).press("Enter");

  await expect(page.locator("#output")).toContainText("LOOK");
  await expect(page.locator(terminalInput)).toHaveValue("");
});

test("restart is safe both immediately and while waiting for input", async ({
  page,
}) => {
  await page.route("**/oregon.bas", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.goto("oregon-trail/", { waitUntil: "domcontentloaded" });
  await page.locator("#restart-game").click();
  await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });

  await page.locator("#restart-game").click();
  await expect(page.locator("#output")).not.toHaveText("LOADING...\n", {
    timeout: 15_000,
  });
  await expect(page.locator(terminalInput)).toBeFocused();
  await expect(page.locator("#status")).toBeHidden();
});

test("restoring visibility repaints and focuses input without moving the terminal", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "reported desktop Safari repaint path");
  await openLauncher(page);
  await page.locator(terminalInput).fill("YES");
  await page.locator(terminalInput).press("Enter");
  await expect(page.locator("#output")).toContainText(
    "HOW GOOD A SHOT ARE YOU WITH YOUR RIFLE?",
  );
  await page.locator("#game-select").focus();
  await expect(page.locator("#game-select")).toBeFocused();

  // Snapshot, dispatch, and re-snapshot inside one evaluate: a pending
  // render-batch frame cannot interrupt a single task, so the visibility
  // dispatch itself is the only thing being observed.
  const { before, after } = await page.locator("#screen").evaluate(
    (screen) => {
      const snapshot = () => ({
        output: screen.textContent,
        scrollTop: screen.scrollTop,
        scrollable: screen.scrollHeight > screen.clientHeight,
      });
      screen.scrollTop = Math.floor(
        (screen.scrollHeight - screen.clientHeight) / 2,
      );
      const before = snapshot();
      document.dispatchEvent(new Event("visibilitychange"));
      const after = snapshot();
      return { before, after };
    },
  );
  expect(before.scrollable).toBe(true);
  expect(after).toEqual(before);
  await expect(page.locator(terminalInput)).toBeFocused();
  await expect(page.locator("#status")).toBeHidden();
});

test("both interpreters recover from an initial worker startup failure", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let shouldFail = true;

    window.Worker = class RetryTestWorker {
      constructor(...arguments_) {
        if (!shouldFail) return new NativeWorker(...arguments_);
        shouldFail = false;
      }

      postMessage() {
        queueMicrotask(() => {
          this.onerror?.({
            message: "Simulated worker startup failure",
            preventDefault() {},
          });
        });
      }

      terminate() {}
    };
  });

  for (const interpreter of ["bwbasic", "retrobasic"]) {
    await page.goto(`oregon-trail/?interpreter=${interpreter}`);
    await expect(page.locator("#output")).not.toHaveText("LOADING...\n", {
      timeout: 15_000,
    });
    await expect(page.locator(terminalInput)).toBeFocused();
    await expect(page.locator("#status")).toBeHidden();
  }
});

test("both interpreters retry an initialization error reported by the worker", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let shouldFail = true;

    window.Worker = class RetryTestWorker {
      constructor(...arguments_) {
        if (!shouldFail) return new NativeWorker(...arguments_);
        shouldFail = false;
      }

      postMessage() {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              type: "ERROR",
              message: "Simulated interpreter initialization failure",
            },
          });
        });
      }

      terminate() {}
    };
  });

  for (const interpreter of ["bwbasic", "retrobasic"]) {
    await page.goto(`oregon-trail/?interpreter=${interpreter}`);
    await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });
    await expect(page.locator("#status")).toBeHidden();
  }
});

test("both interpreters recover when worker construction initially throws", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let shouldFail = true;
    window.workerConstructionAttempts = 0;

    window.Worker = class RetryTestWorker {
      constructor(...arguments_) {
        window.workerConstructionAttempts++;
        if (shouldFail) {
          shouldFail = false;
          throw new Error("Simulated worker construction failure");
        }
        return new NativeWorker(...arguments_);
      }
    };
  });

  for (const interpreter of ["bwbasic", "retrobasic"]) {
    await page.goto(`oregon-trail/?interpreter=${interpreter}`);
    await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });
    await expect(page.locator("#status")).toBeHidden();
    expect(await page.evaluate(() => window.workerConstructionAttempts)).toBe(
      2,
    );
  }
});

test("game source loading retries once for both interpreters", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    let shouldFail = true;
    window.gameSourceFetchAttempts = 0;

    window.fetch = (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.href,
      );
      if (url.pathname.endsWith("/oregon.bas")) {
        window.gameSourceFetchAttempts++;
        if (shouldFail) {
          shouldFail = false;
          return Promise.reject(new TypeError("Simulated source fetch failure"));
        }
      }
      return nativeFetch(input, init);
    };
  });

  for (const interpreter of ["bwbasic", "retrobasic"]) {
    await page.goto(`oregon-trail/?interpreter=${interpreter}`);
    await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });
    await expect(page.locator("#status")).toBeHidden();
    expect(await page.evaluate(() => window.gameSourceFetchAttempts)).toBe(2);
  }
});

test("game source retry is bounded", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.gameSourceFetchAttempts = 0;

    window.fetch = (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.href,
      );
      if (url.pathname.endsWith("/oregon.bas")) {
        window.gameSourceFetchAttempts++;
        return Promise.reject(new TypeError("Simulated source fetch failure"));
      }
      return nativeFetch(input, init);
    };
  });

  await page.goto("oregon-trail/");
  await expect(page.locator("#status")).toContainText(
    "Could not load examples/creative-computing-magazine/oregon.bas",
  );
  expect(await page.evaluate(() => window.gameSourceFetchAttempts)).toBe(3);
});

test("worker startup retry is bounded", async ({ page }) => {
  await page.addInitScript(() => {
    window.workerConstructionAttempts = 0;

    window.Worker = class FailingTestWorker {
      constructor() {
        window.workerConstructionAttempts++;
      }

      postMessage() {
        queueMicrotask(() => {
          this.onerror?.({
            message: "Simulated persistent worker failure",
            preventDefault() {},
          });
        });
      }

      terminate() {}
    };
  });

  await page.goto("oregon-trail/");
  await expect(page.locator("#status")).toHaveText(
    "Simulated persistent worker failure",
  );
  expect(await page.evaluate(() => window.workerConstructionAttempts)).toBe(3);
});

test("worker startup timeout retries twice and then reports failure", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    window.workerConstructionAttempts = 0;

    window.Worker = class HangingTestWorker {
      constructor() {
        window.workerConstructionAttempts++;
      }

      postMessage() {}

      terminate() {}
    };
  });

  await page.goto("oregon-trail/", { waitUntil: "domcontentloaded" });
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(() => window.crossOriginIsolated);
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  // Clear the service-worker isolation grace window (faked clock) so the
  // first worker attempt can be constructed.
  await page.clock.fastForward(1_501);
  await expect
    .poll(() => page.evaluate(() => window.workerConstructionAttempts))
    .toBe(1);

  // Each hanging attempt burns the 8s startup timeout; the next attempt is
  // backed off linearly (600ms, then 1200ms).
  await page.clock.fastForward(8_601);
  await expect
    .poll(() => page.evaluate(() => window.workerConstructionAttempts))
    .toBe(2);
  await page.clock.fastForward(9_201);
  await expect
    .poll(() => page.evaluate(() => window.workerConstructionAttempts))
    .toBe(3);

  await page.clock.fastForward(8_001);
  await expect(page.locator("#status")).toHaveText(
    "The interpreter worker timed out during startup.",
  );
  expect(await page.evaluate(() => window.workerConstructionAttempts)).toBe(3);
});

test("STARTED permits a BASIC program to remain silent past the startup timeout", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    window.workerConstructionAttempts = 0;
    window.workerStarted = false;

    window.Worker = class SilentStartedTestWorker {
      constructor() {
        window.workerConstructionAttempts++;
      }

      postMessage(message) {
        if (message.type === "INIT") {
          // The real launcher disarms index.html's boot watchdog when the
          // interpreter produces its first output; a silent-but-started
          // interpreter disarms it here for the same reason, so this test
          // exercises only the launcher's startup-timeout contract.
          document.documentElement.dataset.basicadeBootDone = "1";
          queueMicrotask(() => this.onmessage?.({ data: { type: "READY" } }));
        } else if (message.type === "START") {
          queueMicrotask(() => {
            window.workerStarted = true;
            this.onmessage?.({ data: { type: "STARTED" } });
          });
        }
      }

      terminate() {}
    };
  });

  await page.goto("oregon-trail/", { waitUntil: "domcontentloaded" });
  // Clear the service-worker isolation grace window (faked clock) so the
  // interpreter start can begin.
  await page.clock.fastForward(1_501);
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => window.workerStarted);
      } catch {
        return false;
      }
    })
    .toBe(true);

  await page.clock.fastForward(30_002);

  await expect(page.locator("#status")).toBeHidden();
  expect(await page.evaluate(() => window.workerConstructionAttempts)).toBe(1);
  await expect(page.locator("#output")).toHaveText("LOADING...\n");
});

test("a stale worker failure cannot disrupt a restarted game", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let shouldFailLate = true;
    window.workerConstructionAttempts = 0;

    window.Worker = class StaleTestWorker {
      constructor(...arguments_) {
        window.workerConstructionAttempts++;
        if (!shouldFailLate) return new NativeWorker(...arguments_);
        shouldFailLate = false;
      }

      postMessage() {
        setTimeout(() => {
          this.onerror?.({
            message: "Simulated stale worker failure",
            preventDefault() {},
          });
        }, 2_000);
      }

      terminate() {}
    };
  });

  await page.goto("oregon-trail/", { waitUntil: "domcontentloaded" });
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => window.crossOriginIsolated);
      } catch {
        return false;
      }
    })
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.workerConstructionAttempts))
    .toBe(1);
  await page.locator("#restart-game").click();
  await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });
  await page.waitForTimeout(2_200);
  await expect(page.locator("#status")).toBeHidden();
  expect(await page.evaluate(() => window.workerConstructionAttempts)).toBe(2);
});

test("a terminal text selection is not collapsed or replaced by refocusing", async ({
  page,
}) => {
  await openLauncher(page);
  await page.locator("#game-select").focus();

  const selectionText = await page.locator("#output").evaluate((output) => {
    const text = output.firstChild;
    if (!text || !text.textContent) throw new Error("terminal has no output");
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(8, text.textContent.length));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    output.closest("#terminal-container").dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    return selection.toString();
  });

  expect(selectionText).not.toBe("");
  await expect(page.locator("#game-select")).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toBe(selectionText);
});

test("the pointer-specific focus path keeps terminal input active", async ({
  page,
  isMobile,
}) => {
  await openLauncher(page);
  await page.locator("#game-select").focus();

  if (isMobile) {
    await page.locator("#terminal-container").tap({ position: { x: 20, y: 20 } });
  } else {
    await page
      .locator("#terminal-container")
      .click({ position: { x: 20, y: 20 } });
  }

  await expect(page.locator(terminalInput)).toBeFocused();
});

test("tapping an active mobile terminal re-raises focus without moving the transcript", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile touch behavior");
  await openLauncher(page);

  const beforeTap = await page.locator(terminalInput).evaluate((input) => {
    window.terminalInputCalls = { focus: 0, selection: 0, cursorMutations: 0 };
    const nativeFocus = input.focus.bind(input);
    const nativeSetSelectionRange = input.setSelectionRange.bind(input);
    input.focus = (...arguments_) => {
      window.terminalInputCalls.focus++;
      return nativeFocus(...arguments_);
    };
    input.setSelectionRange = (...arguments_) => {
      window.terminalInputCalls.selection++;
      return nativeSetSelectionRange(...arguments_);
    };
    new MutationObserver(() => window.terminalInputCalls.cursorMutations++).observe(
      document.getElementById("cursor"),
      { attributeFilter: ["class"] },
    );

    const terminal = document.getElementById("terminal-container");
    const screen = document.getElementById("screen");
    return {
      height: terminal.getBoundingClientRect().height,
      scrollTop: screen.scrollTop,
    };
  });

  await page.locator("#output").tap({ position: { x: 20, y: 8 } });

  await expect(page.locator(terminalInput)).toBeFocused();
  // A tap on the already-focused field deliberately blurs and re-focuses
  // it: iOS only raises the soft keyboard for a focus() call made inside a
  // released tap, and the auto-focus that requested input left the field
  // focused with the keyboard still closed. The caret is re-parked at the
  // end and the cursor animation is untouched.
  expect(await page.evaluate(() => window.terminalInputCalls)).toEqual({
    focus: 1,
    selection: 1,
    cursorMutations: 0,
  });
  // The keyboard driver's no-show guard undoes its forecast: with no honest
  // viewport change the terminal is back at full size, and the transcript
  // never moved.
  await page.waitForTimeout(1_600);
  expect(
    await page.evaluate(() => ({
      height: document
        .getElementById("terminal-container")
        .getBoundingClientRect().height,
      scrollTop: document.getElementById("screen").scrollTop,
    })),
  ).toEqual(beforeTap);
});

test("clicking an active desktop terminal does not restart its cursor", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop mouse behavior");
  await openLauncher(page);

  await page.locator(terminalInput).evaluate((input) => {
    window.activeTerminalCalls = {
      blur: 0,
      focus: 0,
      selection: 0,
      cursorMutations: 0,
    };
    const nativeFocus = input.focus.bind(input);
    const nativeSetSelectionRange = input.setSelectionRange.bind(input);
    input.focus = (...arguments_) => {
      window.activeTerminalCalls.focus++;
      return nativeFocus(...arguments_);
    };
    input.setSelectionRange = (...arguments_) => {
      window.activeTerminalCalls.selection++;
      return nativeSetSelectionRange(...arguments_);
    };
    input.addEventListener("blur", () => window.activeTerminalCalls.blur++);

    const cursor = document.getElementById("cursor");
    new MutationObserver(() => window.activeTerminalCalls.cursorMutations++).observe(
      cursor,
      { attributeFilter: ["class"] },
    );
  });

  expect(
    await page.locator("#output").evaluate((output) =>
      output.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      ),
    ),
  ).toBe(true);

  await page.locator("#terminal-container").click({ position: { x: 20, y: 20 } });

  await expect(page.locator(terminalInput)).toBeFocused();
  expect(await page.evaluate(() => window.activeTerminalCalls)).toEqual({
    blur: 0,
    focus: 0,
    selection: 0,
    cursorMutations: 0,
  });
});

test("clicking terminal text preserves the cursor interval and text selection", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop mouse behavior");
  await openLauncher(page);

  await page.locator("#cursor").evaluate((cursor) => {
    window.textClickCursorMutations = 0;
    new MutationObserver(() => window.textClickCursorMutations++).observe(
      cursor,
      { attributeFilter: ["class"] },
    );
  });

  await page.locator("#output").click({ position: { x: 20, y: 8 } });
  await expect(page.locator(terminalInput)).toBeFocused();
  expect(await page.evaluate(() => window.textClickCursorMutations)).toBe(0);

  const output = page.locator("#output");
  const box = await output.boundingBox();
  if (!box) throw new Error("terminal output is not visible");
  await page.mouse.move(box.x + 4, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(box.width - 4, 180), box.y + 8);
  await page.mouse.up();

  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString().length ?? 0))
    .toBeGreaterThan(0);
});

test("mobile portrait and landscape preserve the active input layout", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile layout characterization");
  await page.setViewportSize({ width: 390, height: 844 });
  await openLauncher(page);

  // The touch shell pins main to the viewport; the hidden input stays
  // absolute at the container's TOP edge so WebKit runs no reveal pan on
  // focus -- the echoed line in the transcript is the visible prompt.
  await expect(page.locator(terminalInput)).toHaveCSS("position", "absolute");
  await expect(page.locator(terminalInput)).toHaveCSS("opacity", "0");
  const portrait = await page.evaluate(() => ({
    launcherColumns: getComputedStyle(document.querySelector(".launcher"))
      .gridTemplateColumns.split(" ").length,
    mainHeight: document.querySelector("main").getBoundingClientRect().height,
    innerHeight: window.innerHeight,
    inputWidth: document
      .getElementById("terminal-input")
      .getBoundingClientRect().width,
    screenWidth: document.getElementById("screen").clientWidth,
    containerMinHeight: getComputedStyle(
      document.getElementById("terminal-container"),
    ).minHeight,
  }));
  expect(portrait.launcherColumns).toBe(1);
  expect(portrait.mainHeight).toBeLessThanOrEqual(portrait.innerHeight);
  expect(portrait.inputWidth).toBeGreaterThan(250);
  expect(portrait.inputWidth).toBeLessThanOrEqual(portrait.screenWidth);
  expect(portrait.containerMinHeight).toBe("160px");

  await page.setViewportSize({ width: 844, height: 390 });
  const landscape = await page.evaluate(() => ({
    launcherColumns: getComputedStyle(document.querySelector(".launcher"))
      .gridTemplateColumns.split(" ").length,
    containerMinHeight: getComputedStyle(
      document.getElementById("terminal-container"),
    ).minHeight,
  }));
  expect(landscape.launcherColumns).toBe(2);
  expect(landscape.containerMinHeight).toBe("120px");
  await expect(page.locator(terminalInput)).toBeFocused();
});

test("a mobile keyboard shrinks the terminal in place without scrolling the page", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile visual viewport behavior");
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, {
      height: window.innerHeight,
      width: window.innerWidth,
      offsetTop: 0,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    window.setTestVisualViewportHeight = (height) => {
      viewport.height = height;
      viewport.dispatchEvent(new Event("resize"));
      return new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    };
  });
  await openLauncher(page);

  const initialPageScroll = await page.evaluate(() => window.scrollY);
  const readInset = () =>
    page.evaluate(() => {
      const value = document
        .querySelector("main")
        .style.getPropertyValue("--keyboard-inset");
      return value ? Number.parseFloat(value) : 0;
    });

  // Raise the keyboard so it covers everything above the terminal's bottom
  // minus 30px. The driver animates --keyboard-inset until the terminal
  // bottom sits above the keyboard, and the page itself never scrolls.
  const keyboardTop = await page.evaluate(async () => {
    const terminalBottom = document
      .getElementById("terminal-container")
      .getBoundingClientRect().bottom;
    const height = terminalBottom - 30;
    await window.setTestVisualViewportHeight(height);
    return height;
  });
  await expect.poll(readInset).toBeGreaterThan(50);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getElementById("terminal-container").getBoundingClientRect()
            .bottom,
      ),
    )
    .toBeLessThanOrEqual(keyboardTop + 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(initialPageScroll);

  // A reader who scrolled up into history stays there while the keyboard
  // resizes again: the wheel marks the scroll as user-owned, releasing the
  // keyboard glue that would otherwise re-pin the transcript.
  const scrolledUp = await page.evaluate(() => {
    const output = document.getElementById("output");
    const screen = document.getElementById("screen");
    output.textContent += `\n${"EARLIER TERMINAL OUTPUT\n".repeat(40)}`;
    screen.scrollTop = screen.scrollHeight - screen.clientHeight - 40;
    return screen.scrollTop;
  });
  await page.evaluate(() => {
    document
      .getElementById("screen")
      .dispatchEvent(new WheelEvent("wheel", { deltaY: -60, cancelable: true }));
  });
  const afterWheel = await page.evaluate(
    () => document.getElementById("screen").scrollTop,
  );
  expect(afterWheel).toBeLessThan(scrolledUp);
  await page.evaluate(
    (height) => window.setTestVisualViewportHeight(height),
    keyboardTop + 20,
  );
  // The driver settles on the honest reading for the new viewport: the
  // main's inset-free bottom (rect bottom + applied inset, an invariant)
  // minus the visible bottom. The reader's scroll survives the resize.
  await expect
    .poll(readInset, { timeout: 10_000 })
    .toBeCloseTo(
      await page.evaluate(() => {
        const main = document.querySelector("main");
        return (
          main.getBoundingClientRect().bottom +
          Number.parseFloat(main.style.getPropertyValue("--keyboard-inset")) -
          (window.visualViewport.offsetTop + window.visualViewport.height)
        );
      }),
      0,
    );
  expect(
    await page.evaluate(() => document.getElementById("screen").scrollTop),
  ).toBe(afterWheel);

  // Keyboard closed: the inset returns to 0, main regains its full height,
  // and the page still never scrolled.
  await page.evaluate(() => window.setTestVisualViewportHeight(window.innerHeight));
  await expect.poll(readInset).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(initialPageScroll);
});

test("terminal controls and output expose stable accessible names", async ({
  page,
}) => {
  await openLauncher(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Basicade — Classic BASIC Games",
  );
  await expect(page.getByRole("region", { name: "Game terminal" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Game command input" })).toBeFocused();
  await expect(page.getByRole("status")).toBeHidden();
  await expect(page.locator("#screen")).toHaveAttribute("aria-live", "off");
});

test("keyboard-only navigation changes controls, restarts, and returns to input", async ({
  browserName,
  isMobile,
  page,
}) => {
  test.skip(isMobile, "physical-keyboard navigation is covered by desktop engines");
  await openLauncher(page);

  await page.locator(terminalInput).press("Shift+Tab");
  await expect(page.locator("#interpreter-select")).toBeFocused();
  await page.locator("#interpreter-select").press("r");
  await page.locator("#interpreter-select").press("Tab");
  await expect(page).toHaveURL(/interpreter=retrobasic/);
  await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });

  await page.locator(terminalInput).press("Shift+Tab");
  await page.locator("#interpreter-select").press("Shift+Tab");
  await expect(page.locator("#game-select")).toBeFocused();
  await page.locator("#game-select").selectOption("bcg-23matches");
  await expect(page).toHaveURL(
    /\/bcg-23-matches\/\?interpreter=retrobasic$/,
  );

  await openLauncher(page);
  // The macOS and Windows WebKit builds only stop plain Tab at text controls
  // and buttons, never at links; Alt+Tab walks every focusable control. The
  // Linux WebKit build has no such restriction and tabs through everything,
  // like Chromium.
  const macStyleWebkitTabs =
    browserName === "webkit" && process.platform !== "linux";
  const tabKey = macStyleWebkitTabs ? "Alt+Tab" : "Tab";
  await page.locator(terminalInput).press(tabKey);
  await expect(page.getByRole("button", { name: "Restart game" })).toBeFocused();
  await page.getByRole("button", { name: "Restart game" }).press(tabKey);
  await expect(page.locator("#github-link")).toBeFocused();
  await page.locator("#github-link").press("Shift+Tab");
  if (macStyleWebkitTabs) {
    // Shift+Tab from a link lands on the previous text stop (the hidden
    // terminal input); walk forward to the button once more. Every other
    // engine, Linux WebKit included, returns straight to the button.
    await expect(page.locator(terminalInput)).toBeFocused();
    await page.locator(terminalInput).press("Alt+Tab");
  }
  await expect(page.getByRole("button", { name: "Restart game" })).toBeFocused();
  await page.getByRole("button", { name: "Restart game" }).press("Enter");
  await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });
});
