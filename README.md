# Basicade

Basicade is a playground for running classic BASIC programs in modern
JavaScript environments. It ports established BASIC interpreters to WebAssembly,
publishes them as npm packages, and uses the same runtime in a browser game
launcher.

The project starts with Creative Computing Magazine's [Oregon Trail](https://minhqdao.github.io/basicade/oregon-trail/) and is being prepared for a carefully
sourced catalogue of the games in David Ahl's *101 BASIC Games*.

## What is here

| Part | Purpose |
| --- | --- |
| [`bwbasic-wasm`](packages/bwbasic-wasm) | [Bywater BASIC](https://sourceforge.net/projects/bwbasic/) for Node.js and browsers |
| [`retrobasic-wasm`](packages/retrobasic-wasm) | [RetroBASIC](https://github.com/maurymarkowitz/RetroBASIC) for Node.js and browsers |
| [`demos/`](demos) | A reusable browser launcher and terminal worker |
| [`examples/`](examples) | BASIC programs and their provenance records |

## Try it locally

Basicade requires Node.js 18 or later. Building the interpreter binaries also
requires [Emscripten](https://emscripten.org/); RetroBASIC additionally needs
Bison and Flex.

```bash
npm install
npm run build:wasm
npm run build
npm run dev
```

The launcher opens at:

```text
http://localhost:5173/oregon-trail/
```

Change `interpreter` to `retrobasic` to run the same program with RetroBASIC.
Named games can have clean, shareable paths; the catalogue also supports explicit
game and interpreter URL parameters for every other selection.

Production builds target the GitHub Pages project path `/basicade/` by default.
Set `BASICADE_BASE_PATH` when deploying the static bundle somewhere else.
The deployed demo uses a service worker to enable the cross-origin isolation
required for interactive input on GitHub Pages; browsers reload once on the
first visit to activate it.

## Deploying the demo to GitHub Pages

1. Push this repository to GitHub and make sure the deployment branch is named
   `main`.
2. In the repository, open **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main`, or run the **CI** workflow manually from the **Actions** tab.
5. After the `deploy-pages` job succeeds, open the URL shown in its
   `github-pages` environment. For this repository it is
   `https://minhqdao.github.io/basicade/oregon-trail/`.

The first visit may reload once while the service worker enables interactive
input. Subsequent visits use the normal terminal immediately.

## How the launcher grows

The launcher deliberately separates the program catalogue from the terminal and
interpreter worker:

```text
URL → game catalogue → BASIC source + compatible interpreter → terminal worker
```

Games are registered in [`demos/catalog.js`](demos/catalog.js). To add one,
place its source and licence/provenance information in `examples/`, add a
catalogue entry, and add a focused compatibility test when the program needs
one. The UI, URL handling, and worker do not need game-specific code. See
[examples/README.md](examples/README.md) and [CONTRIBUTING.md](CONTRIBUTING.md)
for the details.

The catalogue goal is 101 playable games, not 101 unchecked transcriptions.
Each program should retain a clear source and redistribution basis, and record
which interpreters it supports.

## Development

```bash
# Run checks and BASIC compatibility suites
npm run test

# Build the deployable browser bundle
npm run build:demo

# Format, lint, and test
npm run all
```

CI rebuilds both WebAssembly interpreters and tests on Linux, macOS, and
Windows. `npm run build:demo` produces a self-contained static `dist/` folder
with the registered game sources and runtime assets.

The interactive terminal uses `SharedArrayBuffer`. Local Vite development sets
the required cross-origin-isolation headers; a GitHub Pages deployment will need
an isolation strategy before interactive input can be enabled there.

## Repository guide

```text
├── demos/          Browser launcher, catalogue, and worker
├── examples/       Playable BASIC programs with per-program provenance
├── interpreters/   Vendored C sources for the BASIC interpreters
├── packages/       Publishable WebAssembly interpreter packages
└── test/           Interpreter, integration, and launcher tests
```

## Licence and attribution

Basicade is distributed under [GPL-2.0-only](LICENSE). Vendored interpreters and
example programs retain their own notices where applicable; see [NOTICE](NOTICE)
and the licence files beside each example.
