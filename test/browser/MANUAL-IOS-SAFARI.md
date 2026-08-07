# iOS Safari browser-interaction checklist

Run this short checklist before releases that change `index.html`,
`demos/launcher.js`, `demos/runner.worker.js`, or any terminal helper.

- [ ] Open a fresh private tab. Confirm the isolation reload completes once and
      the first game prompt appears.
- [ ] Tap the terminal in portrait. Confirm the keyboard opens and the active
      input line remains visible.
- [ ] Type lowercase characters, backspace twice, and submit with Return/Go.
      Confirm characters stay in order, display in uppercase, and reach the game.
- [ ] Rotate to landscape with the keyboard open. Confirm the active line stays
      visible and typing continues without losing focus.
- [ ] Rotate back to portrait. Confirm the terminal fills the available height.
- [ ] Dismiss the keyboard, drag-select terminal output, and release. Confirm the
      selection remains and the keyboard does not reopen.
- [ ] Tap the terminal once. Confirm the selection clears and the keyboard opens.
- [ ] Press Restart while the game is waiting for input. Confirm exactly one new
      run starts and accepts input.
- [ ] Reload and press Restart immediately during loading. Confirm no stale output
      or error from the abandoned worker appears.
- [ ] Change games and interpreters. Confirm the URL and selected options agree
      and the new game accepts input.
