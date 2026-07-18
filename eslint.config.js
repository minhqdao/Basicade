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
    files: ["scripts/**/*.mjs", "scripts/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: [
      "node_modules/",
      "emsdk-cache/",
      "dist/",
      "build/",
      "wasm/",
      "native/",
      "examples/",
      "test/",
    ],
  },
];
