/** Receives one line written by the interpreter. */
export type BasicOutputHandler = (line: string) => void;

export interface RunBasicOptions {
  /** The BASIC program source code as a string */
  source: string;
  /** Called for each line of standard output */
  onStdout?: BasicOutputHandler;
  /** Called for each line of standard error */
  onStderr?: BasicOutputHandler;
  /**
   * Input lines to provide to the BASIC program.
   * Programs that use `INPUT` will consume these line-by-line.
   * If omitted or exhausted, the interpreter receives EOF.
   */
  stdin?: readonly string[];
}

interface EmscriptenModule {
  FS: {
    writeFile(
      path: string,
      data: string | Uint8Array,
      options?: Record<string, unknown>,
    ): void;
  };
  callMain(args?: string[]): number;
}

interface EmscriptenOptions {
  noInitialRun?: boolean;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  stdin?: () => number | null;
}

declare function createModule(
  options?: EmscriptenOptions,
): Promise<EmscriptenModule>;

/**
 * Runs a BASIC program in Node.js or the browser using WebAssembly.
 *
 * @returns The interpreter exit code (`0` typically indicates success).
 */
export async function runBasic(options: RunBasicOptions): Promise<number> {
  const { default: createModule } = await import("../wasm/bwbasic.js");

  const emscriptenOptions: EmscriptenOptions = {
    noInitialRun: true,
  };

  if (options.onStdout) {
    emscriptenOptions.print = options.onStdout;
  }
  if (options.onStderr) {
    emscriptenOptions.printErr = options.onStderr;
  }
  if (options.stdin) {
    const lines = [...options.stdin];
    let lineIndex = 0;
    let charIndex = 0;
    let currentLine = "";

    emscriptenOptions.stdin = () => {
      if (charIndex >= currentLine.length) {
        if (lineIndex >= lines.length) return null;
        const line = lines[lineIndex++];
        currentLine = line.endsWith("\n") ? line : `${line}\n`;
        charIndex = 0;
      }
      return currentLine.charCodeAt(charIndex++);
    };
  }

  const module = await createModule(emscriptenOptions);
  module.FS.writeFile("app.bas", options.source);

  try {
    return module.callMain(["app.bas"]);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      return (error as { status: number }).status;
    }
    throw error;
  }
}
