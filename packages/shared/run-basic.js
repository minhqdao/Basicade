// @ts-check

/** @typedef {import("./run-basic.d.ts").LoadModule} LoadModule */
/** @typedef {import("./run-basic.d.ts").RunBasicOptions} RunBasicOptions */

/** Creates an interpreter-specific `runBasic` function around a WASM loader. */
export function createRunBasic(/** @type {LoadModule} */ loadModule) {
  return async function runBasic(/** @type {RunBasicOptions} */ options) {
    const { default: createModule } = await loadModule();
    const emscriptenOptions = { noInitialRun: true };

    if (options.onStdout) emscriptenOptions.print = options.onStdout;
    if (options.onStderr) emscriptenOptions.printErr = options.onStderr;
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
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number"
      ) {
        return error.status;
      }
      throw error;
    }
  };
}
