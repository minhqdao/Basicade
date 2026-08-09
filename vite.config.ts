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
  plugins: [copyLauncherAssets()],
}));
