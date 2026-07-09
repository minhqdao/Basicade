export interface BwbasicModule {
  FS: {
    writeFile(path: string, data: string | Uint8Array): void;
    // Emscripten Standard Streams
    // You might want these later to intercept game input/output!
    init?(
      stdin: () => number | null,
      stdout: (char: number) => void,
      stderr: (char: number) => void,
    ): void;
  };
  callMain(args?: string[]): number;
}

export default function createModule(
  options?: Record<string, unknown>,
): Promise<BwbasicModule>;
