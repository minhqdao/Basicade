import assert from "node:assert/strict";

import {
  hasTextSelection,
  updateTextContent,
} from "../demos/terminal-selection.js";

assert.equal(hasTextSelection(null), false);
assert.equal(hasTextSelection({ isCollapsed: true }), false);
assert.equal(
  hasTextSelection({ isCollapsed: false }),
  true,
  "a dragged text range prevents the terminal input from stealing focus",
);

let writes = 0;
const element = {
  value: "SELECTED OUTPUT",
  get textContent() {
    return this.value;
  },
  set textContent(value) {
    writes++;
    this.value = value;
  },
};

updateTextContent(element, "SELECTED OUTPUT");
assert.equal(
  writes,
  0,
  "rendering unchanged terminal output leaves selected text nodes intact",
);

updateTextContent(element, "NEW OUTPUT");
assert.equal(writes, 1, "new terminal output is still rendered");
assert.equal(element.textContent, "NEW OUTPUT");

console.log("test: terminal text selection survives focus and render updates");
