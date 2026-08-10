import { expect, test } from "@playwright/test";

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
  expect(await page.evaluate(() => window.gameSourceFetchAttempts)).toBe(2);
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
  expect(await page.evaluate(() => window.workerConstructionAttempts)).toBe(2);
});

test("worker startup timeout retries once and then reports failure", async ({
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

  await page.clock.fastForward(15_001);
  await expect
    .poll(() => page.evaluate(() => window.workerConstructionAttempts))
    .toBe(2);
  await page.clock.fastForward(15_001);

  await expect(page.locator("#status")).toHaveText(
    "The interpreter worker timed out during startup.",
  );
  expect(await page.evaluate(() => window.workerConstructionAttempts)).toBe(2);
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

test("tapping an active mobile terminal does not refocus or reposition it", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile touch behavior");
  await openLauncher(page);

  const beforeTap = await page.locator(terminalInput).evaluate((input) => {
    window.terminalInputCalls = { focus: 0, selection: 0 };
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

    const terminal = document.getElementById("terminal-container");
    const screen = document.getElementById("screen");
    return {
      height: terminal.getBoundingClientRect().height,
      scrollTop: screen.scrollTop,
    };
  });

  await page.locator("#terminal-container").tap({ position: { x: 20, y: 20 } });

  await expect(page.locator(terminalInput)).toBeFocused();
  expect(await page.evaluate(() => window.terminalInputCalls)).toEqual({
    focus: 0,
    selection: 0,
  });
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

test("mobile portrait and landscape preserve the active input layout", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile layout characterization");
  await page.setViewportSize({ width: 390, height: 844 });
  await openLauncher(page);

  await expect(page.locator(terminalInput)).toHaveCSS("position", "static");
  const portraitWidths = await page.evaluate(() => ({
    input: document
      .getElementById("terminal-input")
      .getBoundingClientRect().width,
    screen: document.getElementById("screen").clientWidth,
  }));
  expect(portraitWidths.input).toBeGreaterThan(250);
  expect(portraitWidths.input).toBeLessThanOrEqual(portraitWidths.screen);
  await expect(page.locator("#terminal-container")).toHaveCSS(
    "min-height",
    "240px",
  );

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(terminalInput)).toHaveCSS("position", "static");
  await expect(page.locator("#terminal-container")).toHaveCSS(
    "min-height",
    "180px",
  );
  await expect(page.locator(terminalInput)).toBeFocused();
});

test("a mobile keyboard constrains the terminal without scrolling the page", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile visual viewport behavior");
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, {
      height: 844,
      width: 390,
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
  const keyboardTop = await page.evaluate(async () => {
    const promptBottom = document
      .getElementById("terminal-input")
      .getBoundingClientRect().bottom;
    const height = promptBottom - 30;
    await window.setTestVisualViewportHeight(height);
    return height;
  });
  await expect(page.locator("#terminal-container")).toHaveClass(
    /keyboard-constrained/,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getElementById("terminal-input").getBoundingClientRect()
            .bottom,
      ),
    )
    .toBeLessThanOrEqual(keyboardTop);
  expect(await page.evaluate(() => window.scrollY)).toBe(initialPageScroll);

  const manuallyScrolled = await page.evaluate(() => {
    const output = document.getElementById("output");
    const screen = document.getElementById("screen");
    const terminal = document.getElementById("terminal-container");
    output.textContent += `\n${"EARLIER TERMINAL OUTPUT\n".repeat(40)}`;
    screen.scrollTop = screen.scrollHeight - screen.clientHeight - 40;
    return {
      height: terminal.getBoundingClientRect().height,
      scrollTop: screen.scrollTop,
    };
  });
  await page.evaluate(
    async (height) => window.setTestVisualViewportHeight(height),
    keyboardTop + 20,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getElementById("terminal-container").getBoundingClientRect()
            .height,
      ),
    )
    .toBe(manuallyScrolled.height);
  expect(
    await page.evaluate(() => document.getElementById("screen").scrollTop),
  ).toBe(manuallyScrolled.scrollTop);

  await page.evaluate(async () => window.setTestVisualViewportHeight(844));
  await expect(page.locator("#terminal-container")).not.toHaveClass(
    /keyboard-constrained/,
  );
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
  await page.locator(terminalInput).press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByRole("button", { name: "Restart game" })).toBeFocused();
  await page.getByRole("button", { name: "Restart game" }).press("Enter");
  await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });
});
