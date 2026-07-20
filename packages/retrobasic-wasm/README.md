# retrobasic-wasm

[![npm](https://img.shields.io/npm/v/retrobasic-wasm.svg)](https://www.npmjs.com/package/retrobasic-wasm)
[![license](https://img.shields.io/npm/l/retrobasic-wasm.svg)](https://github.com/minhqdao/basicade/blob/main/packages/retrobasic-wasm/LICENSE)

[RetroBASIC](https://github.com/retrobasic/retrobasic) interpreter compiled to WebAssembly.

Run classic BASIC programs in Node.js or the browser. The WASM binary is ~283 KB (single-file, no external `.wasm` fetch required).

## Install

```bash
npm install retrobasic-wasm
```

## Usage

### Node.js

```ts
import { runBasic } from "retrobasic-wasm";

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
import { runBasic } from "retrobasic-wasm";

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
import { runBasic } from "retrobasic-wasm";

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

## Development

> Building the WASM binary requires [Emscripten](https://emscripten.org/docs/getting_started/downloads.html), [Bison](https://www.gnu.org/software/bison/), and [Flex](https://github.com/westes/flex).

```bash
# From the repository root
npm install

# Build the WASM binary
npm run build:wasm:retrobasic

# Build the TypeScript package
npm run build:retrobasic

# Start the Vite dev server (demo)
npm run dev

# Run tests
npm run test
```

## License

[GPL-2.0](LICENSE)
