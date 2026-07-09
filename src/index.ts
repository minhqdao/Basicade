import createModule from "../wasm/bwbasic.js";
import type { ModuleOptions } from "../wasm/bwbasic.js";

export interface RunBasicOptions {
  /** The legacy BASIC code content as a string */
  source: string;
  /** Callback to receive a standard output text line from the interpreter */
  onStdout?: (line: string) => void;
  /** Callback to receive error messages from the interpreter */
  onStderr?: (line: string) => void;
}

/**
 * Runs raw BASIC text in the browser or environment using WebAssembly.
 * @returns The runtime exit code (0 usually means success).
 */
export async function runBasic(options: RunBasicOptions): Promise<number> {
  const emscriptenOptions: ModuleOptions = {
    noInitialRun: true,
  };

  if (options.onStdout) {
    emscriptenOptions.print = options.onStdout;
  }
  if (options.onStderr) {
    emscriptenOptions.printErr = options.onStderr;
  }

  // Initialize the compiled WebAssembly bundle
  const module = await createModule(emscriptenOptions);

  // Write the basic script to the in-memory virtual filesystem
  module.FS.writeFile("app.bas", options.source);

  try {
    // Run Bywater BASIC with the targeted script file
    return module.callMain(["app.bas"]);
  } catch (error) {
    // Emscripten may throw an exit status code object or general error; handle gracefully
    if (error && typeof error === "object" && "status" in error) {
      return (error as { status: number }).status;
    }
    throw error;
  }
}
