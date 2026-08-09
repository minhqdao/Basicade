# 🕹️ Basicade

[![Play Live Demo](https://img.shields.io/badge/Play_Live_Demo-Basicade_Launcher-brightgreen?style=for-the-badge&logo=githubpages)](https://minhqdao.github.io/Basicade/)

Basicade preserves retro computing history by bringing original 1970s and 1980s BASIC software to the modern web. By porting classic interpreters (**Bywater BASIC**, **RetroBASIC**) to WebAssembly, it runs raw `.bas` source code directly in JavaScript environments—no emulators or syntax rewrites required.

## Features

- 🎮 **Playable Arcade:** Play [*The Oregon Trail*](https://minhqdao.github.io/Basicade/oregon-trail/), [*Hammurabi*](https://minhqdao.github.io/Basicade/bcg-hammurabi/), [*Lunar Lander*](https://minhqdao.github.io/Basicade/bcg-lunar/), and [*Super Star Trek*](https://minhqdao.github.io/Basicade/bcg-super-star-trek/?interpreter=retrobasic) directly in your browser.
- 📦 **NPM Packages:** Import [bwbasic-wasm](https://www.npmjs.com/package/bwbasic-wasm) or [retrobasic-wasm](https://www.npmjs.com/package/retrobasic-wasm) to run legacy BASIC code inside your own JS/TS applications.
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

Developing Basicade requires Node.js 20.19 or later on the Node 20 line, Node.js
22.13 or later on the Node 22 line, or Node.js 24 or later. The published WASM
packages retain their separate Node.js 18 runtime requirement. Building the
interpreter binaries also requires [Emscripten](https://emscripten.org/);
CI uses Emscripten 6.0.6 for reproducible WASM builds. RetroBASIC additionally
needs Bison and Flex.

```bash
# Installs dependencies
npm install

# Creates Wasm builds
npm run build:wasm

# Runs the demo
npm run dev

# Format, lint, and test
npm run all

# Run browser interaction characterization tests
npx playwright install chromium webkit
npm run test:browser
```

Browser tests cover desktop and mobile-emulated Chromium and WebKit. Changes to
the launcher, worker, or terminal layout should also follow the short real-device
[iOS Safari checklist](test/browser/MANUAL-IOS-SAFARI.md).

The launcher opens at:

```text
http://localhost:5173/oregon-trail/
```

Every game has a shareable path. Use `?interpreter=retrobasic` to choose a
non-default interpreter. Legacy `?game=<id>&interpreter=<id>` links remain
supported and are automatically updated to the canonical game path.

**Input behavior:** In RetroBASIC, pressing Enter without typing at an `INPUT`
prompt keeps the variable's previous value, so a game may repeat your last
answer. Bywater BASIC uses `0` for blank numeric input and an empty string for
blank text input. This difference reflects the interpreters' BASIC dialects.

## Deploying the demo to GitHub Pages

The [demo](https://minhqdao.github.io/Basicade/) is automatically deployed to GitHub Pages using GitHub Actions upon push to `main` if CI and build jobs succeed.

## AI Disclaimer

Basicade was designed and built with assistance from several Large Language Models:

- **Architecture & Planning:** Early setup, design planning, and strategy were assisted by ChatGPT.
- **Execution & Integration:** Core implementation—including WebAssembly compilation/packaging, catalog management, game wiring, testing, and deployment workflows—was developed in collaboration with Codex and ChatGPT 5.6.

## License and Sources

Copyrightable contributions to Basicade are licensed under the [MIT License](LICENSE) in
the repository root, except where a file or distributable artifact states
otherwise. That license does not relicense vendored interpreters, their derived
WASM packages, third-party test fixtures, or historical program listings.
Those components retain the terms and notices below, see [NOTICE](NOTICE).
