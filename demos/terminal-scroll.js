/** Scrolls the terminal viewport to its latest content. */
export function scrollTerminalToBottom(screen) {
  if (screen.scrollHeight > screen.clientHeight) {
    screen.scrollTop = screen.scrollHeight;
  }
}

/** Returns how far an active line extends below the visible viewport. */
export function terminalActiveLineOverlap(
  activeLine,
  visibleBottom,
  padding = 8,
) {
  return Math.max(
    0,
    activeLine.getBoundingClientRect().bottom + padding - visibleBottom,
  );
}

/** Returns the terminal height that fits immediately above an obstruction. */
export function terminalHeightAboveViewport(
  terminal,
  visibleBottom,
  padding = 8,
) {
  return Math.max(
    1,
    Math.floor(visibleBottom - terminal.getBoundingClientRect().top - padding),
  );
}
