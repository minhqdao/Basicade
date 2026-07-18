export interface RetrobasicModule {
  FS: {
    writeFile(
      path: string,
      data: string | Uint8Array,
      options?: Record<string, unknown>,
    ): void;
  };
  callMain(args?: string[]): number;
}

export interface ModuleOptions {
  noInitialRun?: boolean;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}

export default function createModule(
  options?: ModuleOptions,
): Promise<RetrobasicModule>;
