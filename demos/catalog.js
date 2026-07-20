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

const basic101Files = Object.freeze([
  "1check",
  "23mtch",
  "3dplot",
  "aceydu",
  "amazin",
  "bagels",
  "basket",
  "batnum",
  "boat",
  "bounce",
  "boxing",
  "chemst",
  "chomp",
  "even",
  "even1",
  "footbl",
  "mathd",
  "mugwump",
  "pizza",
  "qubic",
  "stars",
  "tictac",
  "trap",
  "wekday",
]);

const basic101Titles = Object.freeze({
  "1check": "1 Check",
  "23mtch": "23 Matches",
  "3dplot": "3D Plot",
  aceydu: "Acey-Ducey",
  amazin: "Amazin'",
  basbal: "Baseball",
  basbl1: "Baseball (alternate edition)",
  blkjac: "Blackjack",
  blkjak: "Blackjack (standard edition)",
  bullcow: "Bulls and Cows",
  buleye: "Bullseye",
  canam: "Can-Am",
  footbl: "Professional Football",
  fotbal: "High School Football",
  guner1: "Gunner I",
  "hi-lo": "Hi-Lo",
  "hi-q": "Hi-Q",
  life2: "Life-2",
  mnopfl: "Monopoly (alternate edition)",
  mnoply: "Monopoly",
  mugwump: "Mugwump",
  rocksp: "Rock, Scissors, Paper",
  rockt1: "Rocket I",
  rockt2: "Rocket II",
  roulet: "Roulette",
  rusrou: "Russian Roulette",
  salvo1: "Salvo I",
  spcwar: "Spacewar",
  wekday: "Weekday",
  yahtze: "Yahtzee",
});

const basic101Games = basic101Files.map((file) => [
  `101-${file}`,
  Object.freeze({
    id: `101-${file}`,
    title: basic101Titles[file] ?? file.toUpperCase(),
    collection: "101 BASIC Computer Games",
    description:
      "A 1975 program transcription; dialect compatibility is still being verified.",
    sourcePath: `examples/101-basic-computer-games/${file}.bas`,
    source: Object.freeze({
      url: "https://github.com/maurymarkowitz/101-BASIC-Computer-Games",
      license: "No licence stated by the upstream repository",
    }),
    interpreters: Object.freeze(["retrobasic"]),
    compatibility: "experimental",
  }),
]);

export const games = Object.freeze({
  "oregon-trail": Object.freeze({
    id: "oregon-trail",
    title: "The Oregon Trail (1978)",
    collection: "Basicade examples",
    description: "The original BASIC edition of the trail survival classic.",
    sourcePath: "examples/oregon-trail/oregon.bas",
    source: Object.freeze({
      url: "https://github.com/clintmoyer/oregon-trail",
      license: "Unlicense",
    }),
    interpreters: Object.freeze(["bwbasic", "retrobasic"]),
  }),
  ...Object.fromEntries(basic101Games),
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
