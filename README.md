# bwbasic-wasm

The [Bywater BASIC](https://github.com/commandbasic/bwbasic) interpreter compiled to WebAssembly.

Run classic BASIC programs — like [The Oregon Trail](examples/oregon-trail/) — in Node.js or the browser.

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

## Demo

A terminal-style demo runs [The Oregon Trail](examples/oregon-trail/) in a CRT monitor simulation.

```bash
npm run build:wasm
npm run dev
```

Then open [http://localhost:5173/demo/](http://localhost:5173/demo/).

The demo uses a Web Worker to run the interpreter off the main thread and
`SharedArrayBuffer` + `Atomics` for synchronous stdin. The Vite dev server
serves the required COOP/COEP headers automatically.

## Development

```bash
# Build the WASM binary
npm run build:wasm

# Build the TypeScript wrapper
npm run build

# Start the Vite dev server (demo)
npm run dev

# Check formatting
npm run format:check

# Type-check
npm run lint

# Build natively (macOS/Linux)
gcc -o native/bwbasic -ansi -pedantic -Wall native/bw*.c -lm
gcc -o native/renum native/renum.c -lm
```

## License

[GPL-2.0](LICENSE)
