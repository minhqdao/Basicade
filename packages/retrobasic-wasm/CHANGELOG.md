# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Sync the vendored interpreter to upstream RetroBASIC 3.0.9:
  - A `-r`/`--random` value now always overrides an in-program `RANDOMIZE`; a bare `-r` no longer consumes the following token as its seed. `RANDOMIZE TIMER` is handled as a bare `RANDOMIZE`, and a `RANDOMIZE` string argument is now a `TYPE MISMATCH` (no catalog program passes one).
  - Upstream also added a negative-`RND(n)` reseed, but it is unreachable: `RND` still parses as an optional-parameter function whose argument is ignored, so `RND(-5)` draws from the current stream exactly as before. Verified natively.
  - `CONT` without a resume point now reports `Can't continue` (error 41) instead of silently doing nothing. Only reachable outside a running program (the CLI forces a running state for immediate statements), so file-run behavior — including the WebAssembly build, which always runs a file — is unchanged. Verified natively.
  - Upstream reverted its 3.0.7 `PRINT` change (the number/string separator fix, originally contributed from this project) to restore BBC BASIC parity. The local deferred-separator patch keeps the behavior this package shipped in 0.1.5, so `PRINT` output is unchanged: word boundaries are preserved, without stray spaces before commas or at line ends. Verified natively (`PRINT "A";1;"B"` yields `A 1 B` with no trailing space).
  - The nanosecond random-seed patch moved from `main.c` to the new `reseed_random()`, where upstream 3.0.9 now does the seeding.

## [0.1.5] - 2026-10-06

### Changed

- Sync the vendored interpreter to upstream RetroBASIC 3.0.8 and adopt its `PRINT` fix, which stops padding numbers in semicolon-separated lists. Comma-separated output is now correctly aligned: `SCORE:  0  TO  2` becomes `SCORE: 0 TO  2`, and `THIS IS HOUR 1 , AT WHAT ANGLE` becomes `THIS IS HOUR 1, AT WHAT ANGLE`. Upstream 3.0.8 itself is packaging-only — a Linux `.desktop` file and its install rules — so the behavioural change here is entirely 3.0.7's.
- Restore the space between a printed number and an adjacent string, which upstream 3.0.7 also removed. Without this, `PRINT "YOU MADE";N;"JUMPS"` renders as `YOU MADE 0JUMPS`. Verified across the full catalog: no program loses a word boundary, and 65 pick up better comma-separated alignment.
- Upstream 3.0.7 also fixes `PRINT USING`, which used to treat any `e` in a format string as an exponent marker, and teaches its CLI `?` as a shorthand for `PRINT`. Neither affects the WebAssembly build, which always runs a file and has no interactive mode.

### Added

- Document the five local patches carried on top of upstream in `interpreters/RetroBASIC/README.md`.

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
