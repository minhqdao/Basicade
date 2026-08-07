/** Scrolls the terminal viewport to its latest content. */
export function scrollTerminalToBottom(screen) {
  if (screen.scrollHeight > screen.clientHeight) {
    screen.scrollTop = screen.scrollHeight;
  }
}

/**
 * Moves only enough terminal content to place its active line above an
 * obstructed visual viewport. Returns whether scrolling was necessary.
 */
export function revealTerminalActiveLine(
  screen,
  activeLine,
  visibleBottom,
  padding = 8,
) {
  const hiddenDistance =
    activeLine.getBoundingClientRect().bottom + padding - visibleBottom;
  if (hiddenDistance <= 0) return false;
  screen.scrollTop += hiddenDistance;
  return true;
}
