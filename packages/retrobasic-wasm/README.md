# retrobasic-wasm

[RetroBASIC](https://github.com/retrobasic/retrobasic) interpreter compiled to WebAssembly.

Run classic BASIC programs in Node.js or the browser.

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

### Browser (Vite)

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

### Options

| Option     | Type                     | Description                             |
| ---------- | ------------------------ | --------------------------------------- |
| `source`   | `string`                 | The BASIC program source code           |
| `onStdout` | `(line: string) => void` | Called for each line of standard output |
| `onStderr` | `(line: string) => void` | Called for each line of standard error  |

### Return value

`runBasic()` returns a `Promise<number>` — the BASIC interpreter's exit code.
`0` typically indicates success; non-zero values indicate an error or `STOP` statement.

## Development

> Building the WASM binary requires [Emscripten](https://emscripten.org/docs/getting_started/downloads.html), [Bison](https://www.gnu.org/software/bison/), and [Flex](https://github.com/westes/flex).

```bash
# Build the WASM binary
npm run build:wasm

# Start the Vite dev server (demo)
npm run dev

# Run tests
npm run test
```

## License

[GPL-2.0](https://github.com/minhqdao/basicade/blob/main/LICENSE)
