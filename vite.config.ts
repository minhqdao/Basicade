import { defineConfig } from "vite";
import { cp } from "node:fs/promises";

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
      ]);
    },
  };
}

export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  plugins: [copyLauncherAssets()],
});
