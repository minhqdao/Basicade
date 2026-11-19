import { defineConfig } from "vite";
import { cp, mkdir } from "node:fs/promises";
import { staticRoutes } from "./demos/routes.js";

function copyLauncherAssets() {
  return {
    name: "copy-basicade-launcher-assets",
    async closeBundle() {
      await Promise.all([
        cp("examples", "dist/examples", { recursive: true }),
        cp("packages/bwbasic-wasm/wasm", "dist/packages/bwbasic-wasm/wasm", {
          recursive: true,
        }),
        cp(
          "packages/retrobasic-wasm/wasm",
          "dist/packages/retrobasic-wasm/wasm",
          { recursive: true },
        ),
        cp(
          "node_modules/coi-serviceworker/coi-serviceworker.js",
          "dist/coi-serviceworker.js",
        ),
      ]);
      await Promise.all(
        staticRoutes.map(async (route) => {
          await mkdir(`dist/${route}`, { recursive: true });
          await cp("dist/index.html", `dist/${route}/index.html`);
        }),
      );
    },
  };
}

export default defineConfig(({ command }) => ({
  base:
    command === "build"
      ? process.env.BASICADE_BASE_PATH ?? "/Basicade/"
      : "/",
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  /* Vite >= 8.3 minifies the inline launcher CSS with lightningcss. Without
     an explicit cssTarget it runs without browser targets and raises
     `(max-width: 560px)` to the shorter range syntax `(width <= 560px)`.
     Safari < 16.4 cannot parse range syntax and drops the entire @media
     block, which silently removed the phone-portrait launcher stacking and
     the other portrait rules on iOS 15 (Safari 15.4+ is the support floor).
     An explicit target keeps classic syntax that every browser parses.
     test/launcher-css-compat.mjs guards this. */
  build: {
    cssTarget: "safari15",
  },
  plugins: [copyLauncherAssets()],
}));
