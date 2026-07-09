# bwbasic-wasm

The [Bywater BASIC](https://github.com/commandbasic/bwbasic) interpreter compiled to WebAssembly.

Run classic BASIC programs — including [The Oregon Trail](examples/oregon-trail/) — in Node.js or the browser.

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

## Development

```bash
# Build the WASM binary
npm run build:wasm

# Build the TypeScript wrapper
npm run build

# Start the Vite dev server (demo)
npm run dev

# Build natively (macOS/Linux)
gcc -o native/bwbasic -ansi -pedantic -Wall native/bw*.c -lm
gcc -o native/renum native/renum.c -lm
```

## License

GPL-2.0-only — see [LICENSE](LICENSE).
