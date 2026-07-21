# 🕹️ Basicade

[![Play Live Demo](https://img.shields.io/badge/Play_Live_Demo-Basicade_Launcher-brightgreen?style=for-the-badge&logo=githubpages)](https://minhqdao.github.io/Basicade/)

Basicade preserves retro computing history by bringing original 1970s and 1980s BASIC software to the modern web. By porting classic interpreters (**Bywater BASIC**, **RetroBASIC**) to WebAssembly, it runs raw `.bas` source code directly in JavaScript environments—no emulators or syntax rewrites required.

## Features

- 🎮 **Playable Arcade:** Play [*The Oregon Trail*](https://minhqdao.github.io/Basicade/oregon-trail/?interpreter=bwbasic), [*Hammurabi*](https://minhqdao.github.io/Basicade/?game=bcg-hammurabi&interpreter=bwbasic), [*Lunar Lander*](https://minhqdao.github.io/Basicade/?game=bcg-lunar&interpreter=bwbasic), and [*Super Star Trek*](https://minhqdao.github.io/Basicade/?game=bcg-superstartrek&interpreter=retrobasic) directly in your browser.
- 📦 **NPM Packages:** Import `@basicade/bwbasic-wasm` or `@basicade/retrobasic-wasm` to run legacy BASIC code inside your own JS/TS applications.
- 📜 **100% Original Code:** Runs raw `.bas` source code without changing line numbers, commands, or dialect syntax.
- ⚡ **WebAssembly Powered:** High-performance runtime isolation powered by Emscripten and SharedArrayBuffer worker threads.

## Repository Structure

```text
Basicade/
├── packages/
│   ├── bwbasic-wasm/     # Bywater BASIC WASM port (ANSI Minimal BASIC)
│   └── retrobasic-wasm/  # RetroBASIC WASM port (70s/80s microcomputer dialects)
├── demos/                # In-browser launcher, terminal UI, and Web Worker thread
├── examples/             # Curated historical .bas programs & provenance records
├── interpreters/         # Vendored C source code for underlying engines
└── test/                 # Cross-interpreter integration & launcher tests
```

## Development

Basicade requires Node.js 18 or later. Building the interpreter binaries also
requires [Emscripten](https://emscripten.org/); RetroBASIC additionally needs
Bison and Flex.

```bash
# Installs dependencies
npm install

# Creates Wasm builds
npm run build:wasm

# Runs the demo
npm run dev

# Format, lint, and test
npm run all
```

The launcher opens at:

```text
http://localhost:5173/oregon-trail/
```

Use `?interpreter=retrobasic` to run the same program with RetroBASIC. The
catalogue also supports `?game=<id>&interpreter=<id>` for every selection.

## Deploying the demo to GitHub Pages

The [demo](https://minhqdao.github.io/Basicade/) is automatically deployed to GitHub Pages using GitHub Actions upon push to `main` if CI and build jobs succeed.

## AI Disclaimer

Basicade was designed and built with assistance from several Large Language Models:

- **Architecture & Planning:** Early setup, design planning, and strategy were assisted by ChatGPT and Gemini.
- **Execution & Integration:** Core implementation—including WebAssembly compilation/packaging, catalog management, game wiring, testing, and deployment workflows—was developed in collaboration with Codex/ChatGPT and OpenCode models.

## License and Sources

Copyrightable contributions to Basicade are licensed under the [MIT License](LICENSE) in
the repository root, except where a file or distributable artifact states
otherwise. That license does not relicense vendored interpreters, their derived
WASM packages, third-party test fixtures, or historical program listings.
Those components retain the terms and notices below, see [NOTICE](NOTICE).
