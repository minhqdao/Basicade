# bwbasic-wasm

The [Bywater BASIC](https://sourceforge.net/projects/bwbasic/) interpreter compiled to WebAssembly.

Run classic BASIC programs — like [The Oregon Trail](https://minhqdao.github.io/bwbasic-wasm/oregon-trail/) — in Node.js or the browser.

## Install

```bash
npm install bwbasic-wasm
```

## Usage

### Node.js

```ts
import { runBasic } from "bwbasic-wasm";

const exitCode = await runBasic({
  source: `
    10 PRINT "Hello from WASM!"
    20 END
  `,
  onStdout: (line) => console.log(line),
});
```

### Browser (Vite)

```ts
import { runBasic } from "bwbasic-wasm";

const response = await fetch("/program.bas");
const source = await response.text();

const outputElement = document.getElementById("terminal");

await runBasic({
  source,
  onStdout: (line) => {
    if (outputElement) outputElement.textContent += line + "\n";
  },
});
```

### Options

| Option | Type | Description |
|---|---|---|
| `source` | `string` | The BASIC program source code |
| `onStdout` | `(line: string) => void` | Called for each line of standard output |
| `onStderr` | `(line: string) => void` | Called for each line of standard error |

### Return value

`runBasic()` returns a `Promise<number>` — the BASIC interpreter's exit code.
`0` typically indicates success; non-zero values indicate an error or `STOP` statement.

## Demo

The repository includes a browser demo running the original [The Oregon Trail](https://minhqdao.github.io/bwbasic-wasm/oregon-trail/) BASIC program in an interactive retro terminal.

## Development

> Building the WASM binary requires [Emscripten](https://emscripten.org/docs/getting_started/downloads.html).

```bash
# From the repository root
npm install

# Build the WASM binary
npm run build:wasm:bwbasic

# Start the Vite dev server (demo)
npm run dev

# Format, lint, and test in one command
npm run all

# Run tests for this package only
npm run test -w packages/bwbasic-wasm
```

## License

[GPL-2.0](https://github.com/minhqdao/bwbasic-wasm/blob/main/LICENSE)
