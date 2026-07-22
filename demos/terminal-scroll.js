/** Scrolls the terminal viewport to its latest content. */
export function scrollTerminalToBottom(screen) {
  if (screen.scrollHeight > screen.clientHeight) {
    screen.scrollTop = screen.scrollHeight;
  }
}
