# Contributing to Basicade

Thanks for helping preserve and run classic BASIC programs.

## Before opening a change

- Keep a change focused: interpreter runtime, launcher, game catalogue, or
  documentation.
- Run `npm run all` for source and test changes.
- Run `npm run build:demo` when changing the launcher, catalogue, or asset
  layout.
- Do not commit generated WASM, package `dist/` output, parser output, or local
  editor files.

## Adding a game

1. Create `examples/<game-id>/` with the BASIC source, `README.md`, and its
   licence or permission record.
2. Document the source location, attribution, and redistribution basis. Do not
   add a scan or transcription merely because it is available online.
3. Register the game in [`demos/catalog.js`](demos/catalog.js), including its
   supported interpreter IDs and provenance metadata.
4. Add or extend a test that exercises the program with every listed
   interpreter. If a dialect is intentionally unsupported, say why in the game
   README instead of listing it as compatible.
5. Run `npm run test` and `npm run build:demo`.

The launcher loads games only from the catalogue. This keeps shared URLs stable,
prevents arbitrary file paths from becoming part of the public API, and lets the
catalogue describe compatibility honestly.

## Working on the interpreters

The C sources in `interpreters/` are vendored upstream projects. Preserve their
copyright and licence notices. Changes to the WebAssembly build belong in the
corresponding package's `scripts/build-wasm.sh`; package-facing API changes also
need README and test updates.

## Reporting problems

Please include the BASIC source (or a minimal reproduction), interpreter ID,
browser or Node.js version, expected behaviour, and actual output.
