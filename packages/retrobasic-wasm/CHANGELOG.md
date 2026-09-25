# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.4] - 2026-09-25

### Changed

- Sync the vendored interpreter to upstream RetroBASIC 3.0.6, replacing local patches for string `<` and `<=` comparisons, `FOR` re-entry, numeric `CLK()`, backslash separators, double-printed numbers, and `INPUT` newlines.
- Pass `--dartmouth-loops` so an exhausted `FOR` loop skips its body, replacing the local skip patch.
- Pre-include `sys/time.h` in the WebAssembly build for newer Emscripten sysroots.

## [0.1.3] - 2026-08-12

### Changed

- Skip `FOR` loop bodies when their initial bounds are already exhausted.
- Replace abandoned `FOR` contexts when re-entering a loop with the same control variable.
- Share the `runBasic()` implementation with the Bywater BASIC package.
- Omit generated source maps from the npm package to avoid shipping maps larger than the bundled interpreter.

## [0.1.2] - 2026-07-22

### Changed

- Improved the random number generator with a better randomizer.

## [0.1.1] - 2026-07-21

### Changed

- Refined the npm description.
- Updated the README introduction and Oregon Trail demo links.
- Added a Play Demo badge that selects RetroBASIC.
- Replaced the npm-registry license badge with a stable GPL-2.0-only badge.
- Corrected the package name in the README introduction.

## [0.1.0] - 2026-07-20

### Added

- Initial release
- `runBasic()` API with `source`, `onStdout`, `onStderr`, and `stdin` options
- ESM package support for Node.js and browsers
- TypeScript declarations included
- Single-file WASM bundle (no external `.wasm` fetch)
- Browser and Node.js compatibility
- GPL source and attribution notice
