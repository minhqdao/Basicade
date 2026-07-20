export const DEFAULT_GAME_ID = "oregon-trail";
export const DEFAULT_INTERPRETER_ID = "bwbasic";

export const interpreters = Object.freeze({
  bwbasic: Object.freeze({
    id: "bwbasic",
    name: "Bywater BASIC",
    wasmPath: "packages/bwbasic-wasm/wasm/bwbasic.js",
  }),
  retrobasic: Object.freeze({
    id: "retrobasic",
    name: "RetroBASIC",
    wasmPath: "packages/retrobasic-wasm/wasm/retrobasic.js",
  }),
});

export const games = Object.freeze({
  "oregon-trail": Object.freeze({
    id: "oregon-trail",
    title: "The Oregon Trail (1978)",
    description: "The original BASIC edition of the trail survival classic.",
    sourcePath: "examples/oregon-trail/oregon.bas",
    interpreters: Object.freeze(["bwbasic", "retrobasic"]),
  }),
});

export function resolveSelection(search = "") {
  const params = new URLSearchParams(search);
  const requestedGameId = params.get("game");
  const game = games[requestedGameId] ?? games[DEFAULT_GAME_ID];
  const requestedInterpreterId = params.get("interpreter");
  const interpreterId = game.interpreters.includes(requestedInterpreterId)
    ? requestedInterpreterId
    : game.interpreters.includes(DEFAULT_INTERPRETER_ID)
      ? DEFAULT_INTERPRETER_ID
      : game.interpreters[0];

  return {
    game,
    interpreter: interpreters[interpreterId],
  };
}

export function selectionUrl(location, { game, interpreter }) {
  const url = new URL(location.href);
  url.searchParams.set("game", game.id);
  url.searchParams.set("interpreter", interpreter.id);
  return url;
}
