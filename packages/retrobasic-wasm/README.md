# retrobasic-wasm

[![npm](https://img.shields.io/npm/v/retrobasic-wasm.svg)](https://www.npmjs.com/package/retrobasic-wasm)
[![license](https://img.shields.io/npm/l/retrobasic-wasm.svg)](https://github.com/minhqdao/Basicade/blob/main/packages/retrobasic-wasm/LICENSE)

Run [RetroBASIC](https://github.com/maurymarkowitz/RetroBASIC) programs wherever JavaScript runs. `retrobasic-wasm` packages the interpreter as a single-file WebAssembly bundle, so there is no separate `.wasm` asset to host or fetch.

It is a natural fit for preserving classic BASIC programs and running retro text
games such as [The Oregon Trail](https://minhqdao.github.io/Basicade/oregon-trail/)
in Node.js or directly in the browser.

## Install

```bash
npm install retrobasic-wasm
```

Requires Node.js 18 or later. This is an ESM-only package; use `import`, not `require()`.

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

Programs that use `INPUT` can receive user input via the `stdin` option. Each entry is one input line; a trailing newline is added when needed.

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
| `stdin`    | `readonly string[]`      | Input lines fed to `INPUT` statements, one per element |

`stdin` also accepts a readonly array, so a frozen array or TypeScript tuple is valid. `runBasic` creates a fresh interpreter for every call, making concurrent calls isolated.

Returns the interpreter exit code — `0` typically indicates success; non-zero indicates an interpreter error or `STOP`. Errors while loading or initializing the WebAssembly module reject the promise.

`onStdout` and `onStderr` receive one newline-free line at a time. Render a newline yourself when writing those values to a terminal or DOM element.

### Types

```ts
type BasicOutputHandler = (line: string) => void;

interface RunBasicOptions {
  source: string;
  stdin?: readonly string[];
  onStdout?: BasicOutputHandler;
  onStderr?: BasicOutputHandler;
}
```

The package exports `runBasic`, `RunBasicOptions`, and `BasicOutputHandler`.

## Compatibility

RetroBASIC implements its own BASIC dialect. Program compatibility depends on the statements and extensions a program uses; this package exposes the interpreter rather than translating BASIC to JavaScript.

## Demo

The repository includes a browser demo running [The Oregon Trail](https://minhqdao.github.io/Basicade/oregon-trail/)
BASIC program in an interactive retro terminal. Select **RetroBASIC** in the
interpreter menu to run it with this package.

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

This package is licensed under [GPL-2.0-only](LICENSE). It includes a modified WebAssembly build of RetroBASIC; copyright and complete-source information are in [NOTICE](NOTICE). The corresponding source and build scripts are available in the [Basicade repository](https://github.com/minhqdao/Basicade/tree/main/packages/retrobasic-wasm).
