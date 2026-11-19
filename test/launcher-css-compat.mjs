import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Guard for the iOS 15 launcher regression first deployed on 2026-10-02.
//
// Vite >= 8.3 minifies the inline launcher CSS in dist/index.html with
// lightningcss. Without an explicit build.cssTarget it runs without browser
// targets and raises `(max-width: 560px)` to the shorter range syntax
// `(width <= 560px)`. Safari < 16.4 cannot parse range syntax and drops the
// ENTIRE @media block, which silently removed the phone-portrait launcher
// stacking (`.launcher { grid-template-columns: 1fr }`) and the other
// portrait rules on iOS 15 devices such as the iPhone 6s (iOS 15.8).
//
// vite.config.ts pins build.cssTarget to "safari15" so the shipped CSS keeps
// classic syntax that every browser parses; this test keeps it pinned.

const distIndex = resolve(
  fileURLToPath(import.meta.url),
  "../../dist/index.html",
);
assert.ok(
  existsSync(distIndex),
  `dist/index.html is missing; run "npm run build:demo" first (${distIndex})`,
);
const html = readFileSync(distIndex, "utf8");

const style = html.match(/<style>([\s\S]*?)<\/style>/);
assert.ok(style, "dist/index.html embeds an inline <style> block");
const css = style[1];

const queries = [...css.matchAll(/@media[^{]+/g)].map((match) =>
  match[0].trim(),
);
assert.ok(queries.length > 0, "the built CSS contains @media queries");

// Range syntax in a media query is fatal on Safari < 16.4: the engine drops
// the whole block it appears in.
for (const query of queries) {
  assert.ok(
    !/[<>]/.test(query),
    `media query uses range syntax, which Safari < 16.4 drops:\n  ${query}\nKeep build.cssTarget pinned in vite.config.ts (see this file's header).`,
  );
}

// The launcher stacking rule that the regression removed must ship inside a
// max-width: 560px media query, in classic syntax. It may live in its own
// width-only query or share the pointer-gated phone-portrait block.
const stackingPattern = /\.launcher\{grid-template-columns:1fr\}/;
const stackingFound = queries.some((query) => {
  if (!/max-width:\s*560px/.test(query)) return false;
  const start = css.indexOf(query);
  let depth = 0;
  let end = -1;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") {
      depth += 1;
    } else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.ok(end !== -1, "a max-width media query block is closed");
  const body = css.slice(start, end + 1).replace(/\s+/g, "");
  return stackingPattern.test(body);
});
assert.ok(
  stackingFound,
  "no max-width: 560px media query stacks the launcher selectors",
);

console.log(
  `test: launcher CSS ships ${queries.length} media queries in classic syntax, stacking rule intact (Safari < 16.4 safe)`,
);
