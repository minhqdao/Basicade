# bwbasic-wasm

[![npm](https://img.shields.io/npm/v/bwbasic-wasm.svg)](https://www.npmjs.com/package/bwbasic-wasm)
[![license](https://img.shields.io/npm/l/bwbasic-wasm.svg)](https://github.com/minhqdao/basicade/blob/main/packages/bwbasic-wasm/LICENSE)

The [Bywater BASIC](https://sourceforge.net/projects/bwbasic/) interpreter compiled to WebAssembly.

Run classic BASIC programs — like [The Oregon Trail](https://minhqdao.github.io/basicade/oregon-trail/) — in Node.js or the browser. The WASM binary is ~446 KB (single-file, no external `.wasm` fetch required).

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

### Browser

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

### Interactive input

Programs that use `INPUT` can receive user input via the `stdin` option:

```ts
import { runBasic } from "bwbasic-wasm";

const exitCode = await runBasic({
  source: `
    10 INPUT "What is your name? "; N$
    20 PRINT "Hello, "; N$; "!"
    30 END
  `,
  stdin: ["Alice"],
  onStdout: (line) => console.log(line),
});
```

## API

### `runBasic(options: RunBasicOptions): Promise<number>`

Runs a BASIC program via WebAssembly.

| Option     | Type                     | Description                                            |
| ---------- | ------------------------ | ------------------------------------------------------ |
| `source`   | `string`                 | The BASIC program source code                          |
| `onStdout` | `(line: string) => void` | Called for each line of standard output                |
| `onStderr` | `(line: string) => void` | Called for each line of standard error                 |
| `stdin`    | `string[]`               | Input lines fed to `INPUT` statements, one per element |

Returns the interpreter exit code — `0` typically indicates success; non-zero indicates an error or `STOP`.

## Demo

The repository includes a browser demo running [The Oregon Trail](https://minhqdao.github.io/basicade/oregon-trail/) BASIC program in an interactive retro terminal.

## Development

> Building the WASM binary requires [Emscripten](https://emscripten.org/docs/getting_started/downloads.html).

```bash
# From the repository root
npm install

# Build the WASM binary
npm run build:wasm:bwbasic

# Build the TypeScript package
npm run build:bwbasic

# Start the Vite dev server (demo)
npm run dev

# Run tests
npm run test
```

## License

[GPL-2.0](LICENSE)
