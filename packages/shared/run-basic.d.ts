export type BasicOutputHandler = (line: string) => void;

export interface RunBasicOptions {
  source: string;
  onStdout?: BasicOutputHandler;
  onStderr?: BasicOutputHandler;
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

type CreateModule = (options?: EmscriptenOptions) => Promise<EmscriptenModule>;

export type LoadModule = () => Promise<{ default: CreateModule }>;

export function createRunBasic(
  loadModule: LoadModule,
): (options: RunBasicOptions) => Promise<number>;
