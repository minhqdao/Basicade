/**
 * Keeps append-only terminal input editing at the end of the native field.
 * The caller must not invoke this while an IME composition is active: the
 * IME owns the selection while its text is marked, and a selection write
 * under it corrupts the marked range -- every composition update then
 * re-inserts its full pending text instead of replacing it.
 */
export function moveInputCaretToEnd(input) {
  const end = input.value.length;
  input.setSelectionRange?.(end, end);
}

/** Touch needs an earlier focus gesture than the synthetic click on mobile. */
export function isTouchPointer(event) {
  return event.pointerType === "touch";
}
