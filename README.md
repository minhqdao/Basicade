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

Run in the project root:
```bash
npm install
npm run build:wasm
npm run dev
```

Then open [http://localhost:5173/demo/](http://localhost:5173/demo/).


## Development

```bash
# Build the WASM binary
npm run build:wasm

# Start the Vite dev server (demo)
npm run dev

# Format, lint, and test in one command
npm run all

# Run formatting
npm run format

# Check formatting
npm run format:check

# Check linting
npm run lint

# Run smoke tests (The Oregon Trail)
npm run test

# Build natively (macOS/Linux)
gcc -o native/bwbasic -ansi -pedantic -Wall native/bw*.c -lm
gcc -o native/renum native/renum.c -lm
```

## License

[GPL-2.0](LICENSE)
