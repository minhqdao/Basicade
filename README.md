# Basicade

Monorepo containing WebAssembly ports of BASIC interpreters.

## Packages

| Package | Description |
|---|---|
| [`bwbasic-wasm`](packages/bwbasic-wasm) | [Bywater BASIC](https://sourceforge.net/projects/bwbasic/) interpreter compiled to WASM |
| [`retrobasic-wasm`](packages/retrobasic-wasm) | [RetroBASIC](https://github.com/retrobasic/retrobasic) interpreter compiled to WASM |

## Development

```bash
npm install

# Build all packages
npm run build

# Build WASM for all interpreters
npm run build:wasm

# Run all tests
npm run test

# Start the game launcher
npm run dev

# Start Oregon Trail with a specific interpreter
http://localhost:5173/?game=oregon-trail&interpreter=retrobasic

# Format, lint, and test in one command
npm run all
```

## Game launcher

The launcher selects a game and its BASIC interpreter with a shareable URL:

- `?game=oregon-trail&interpreter=bwbasic` (default)
- `?game=oregon-trail&interpreter=retrobasic`

Games and their supported interpreters are registered in [`demos/catalog.js`](demos/catalog.js). Adding a game means adding its source under `examples/` and one catalog entry; the launcher, terminal, worker, and URL handling stay unchanged.

The interactive terminal uses `SharedArrayBuffer`, so production hosting must provide cross-origin isolation headers (COOP and COEP). Vite configures them for local development. GitHub Pages needs an additional isolation approach before interactive input can be deployed there.

## Structure

```
├── demos/                  Shared demo code
├── examples/               Example BASIC programs
├── interpreters/           Vendored C interpreter sources
├── packages/
│   ├── bwbasic-wasm/       Bywater BASIC WASM package
│   └── retrobasic-wasm/    RetroBASIC WASM package
└── vite.config.ts          Shared dev server config
```

## License

[GPL-2.0](LICENSE)
