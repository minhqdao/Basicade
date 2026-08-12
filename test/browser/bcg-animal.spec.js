import { expect, test } from "@playwright/test";

const terminalInput = "#terminal-input";

async function answer(page, value, nextPrompt) {
  const input = page.locator(terminalInput);
  const output = page.locator("#output");
  const previousPrompts = await output
    .textContent()
    .then((text) => text?.split(nextPrompt).length - 1 || 0);
  await expect(input).toBeFocused({ timeout: 15_000 });
  await input.pressSequentially(value);
  await input.press("Enter");
  await expect
    .poll(
      () =>
        output
          .textContent()
          .then((text) => text?.split(nextPrompt).length - 1 || 0),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(previousPrompts);
}

test("RetroBASIC Animal traverses a question learned during play", async ({
  page,
}) => {
  await page.goto("bcg-animal/?interpreter=retrobasic");

  await answer(page, "yes", "DOES IT SWIM?");
  await answer(page, "no", "IS IT A BIRD?");
  await answer(page, "no", "THE ANIMAL YOU WERE THINKING OF WAS A ?");
  await answer(page, "elephant", "PLEASE TYPE IN A QUESTION");
  await answer(page, "does the animal have a trunk", "THE ANSWER WOULD BE ?");
  await answer(page, "yes", "ARE YOU THINKING OF AN ANIMAL?");
  await answer(page, "yes", "DOES IT SWIM?");
  await answer(page, "no", "DOES THE ANIMAL HAVE A TRUNK?");
  await answer(page, "yes", "IS IT A ELEPHANT?");
  await expect(page.locator(terminalInput)).toBeFocused();
});
