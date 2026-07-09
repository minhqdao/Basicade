import createModule from "../wasm/bwbasic.js";
import type { BwbasicModule } from "../wasm/bwbasic.js";

export interface RunOptions {
  /** The raw text content of the basic source code (.bas) */
  programSource: string;
  /** Optional array of arguments to pass into the runtime */
  args?: string[];
}

export async function runBasic(options: RunOptions): Promise<number> {
  // Initialize the Emscripten module
  const module: BwbasicModule = await createModule({
    // Emscripten flags can be customized here if needed (e.g., custom stdout overrides)
    noInitialRun: true,
  });

  // Write the virtual file system file so bwbasic can read it
  module.FS.writeFile("program.bas", options.programSource);

  // Combine program file with any other args passed
  const executionArgs = ["program.bas", ...(options.args || [])];

  // Run the interpreter main function
  return module.callMain(executionArgs);
}
