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
  await page.locator("#game-select").press("2");
  await page.locator("#game-select").press("Tab");
  await expect(page).toHaveURL(/game=bcg-23matches/);

  await openLauncher(page);
  await page.locator(terminalInput).press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByRole("button", { name: "Restart game" })).toBeFocused();
  await page.getByRole("button", { name: "Restart game" }).press("Enter");
  await expect(page.locator(terminalInput)).toBeFocused({ timeout: 15_000 });
});
