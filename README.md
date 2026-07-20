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

# Start the demo (defaults to bwbasic)
npm run dev

# Start the demo with a specific interpreter
# http://localhost:5173/demos/oregon-trail/?interpreter=retrobasic

# Format, lint, and test in one command
npm run all
```

## Demo

The Oregon Trail demo supports both interpreters via a query parameter:

- `?interpreter=bwbasic` (default)
- `?interpreter=retrobasic`

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
