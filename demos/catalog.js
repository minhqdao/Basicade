export const DEFAULT_GAME_ID = "creative-computing-magazine";
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
  "basbal",
  "basket",
  "batnum",
  "boat",
  "bounce",
  "bowl",
  "boxing",
  "buzzwd",
  "change",
  "chemst",
  "chief",
  "chomp",
  "diamnd",
  "dice",
  "digits",
  "even",
  "even1",
  "footbl",
  "golf",
  "gomoko",
  "gunner",
  "litqz",
  "mathd",
  "mugwump",
  "number",
  "pizza",
  "qubic",
  "reverse",
  "rusrou",
  "stars",
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
      "A 1975 program transcription verified to start with RetroBASIC.",
    sourcePath: `examples/101-basic-computer-games/${file}.bas`,
    source: Object.freeze({
      url: "https://github.com/maurymarkowitz/101-BASIC-Computer-Games",
      license: "No licence stated by the upstream repository",
    }),
    interpreters: Object.freeze(["retrobasic"]),
    compatibility: "smoke-tested",
  }),
]);

export const games = Object.freeze({
  "creative-computing-magazine": Object.freeze({
    id: "creative-computing-magazine",
    title: "The Oregon Trail",
    collection: "Creative Computing Magazine",
    description: "The original BASIC edition of the trail survival classic.",
    sourcePath: "examples/creative-computing-magazine/oregon.bas",
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
