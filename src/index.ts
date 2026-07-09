import createModule from "../wasm/bwbasic.js";

export async function createBwbasic() {
  return createModule({
    noInitialRun: true,
  });
}
