import { createRunBasic } from "../../shared/run-basic.js";

/** Receives one line written by the interpreter. */
export type BasicOutputHandler = (line: string) => void;

export interface RunBasicOptions {
  source: string;
  onStdout?: BasicOutputHandler;
  onStderr?: BasicOutputHandler;
  stdin?: readonly string[];
}

const run = createRunBasic(
  () => import("../wasm/retrobasic.js"),
  [
    // The catalog is DEC/Dartmouth sources, which expect an exhausted FOR to
    // skip its body; upstream RetroBASIC keeps MS fall-through by default.
    "--dartmouth-loops",
  ],
);

/** Runs a BASIC program with RetroBASIC. */
export function runBasic(options: RunBasicOptions): Promise<number> {
  return run(options);
}
