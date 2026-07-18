import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    rules: {
      eqeqeq: "error",
    },
  },
  {
    files: ["demos/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    ignores: [
      "node_modules/",
      "emsdk-cache/",
      "packages/*/dist/",
      "packages/*/wasm/",
      "packages/*/node_modules/",
      "build/",
      "interpreters/",
      "examples/",
      "packages/*/test/",
      "test/",
    ],
  },
];
