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

const basicComputerGamesFiles = Object.freeze([
  "23matches",
  "3dplot",
  "aceyducey",
  "amazing",
  "animal",
  "awari",
  "bagels",
  "banner",
  "basketball",
  "batnum",
  "battle",
  "blackjack",
  "bombardment",
  "bombsaway",
  "bounce",
  "bowling",
  "boxing",
  "bug",
  "bullfight",
  "bullseye",
  "bunny",
  "buzzword",
  "calendar",
  "change",
  "checkers",
  "chemist",
  "chief",
  "chomp",
  "civilwar",
  "combat",
  "craps",
  "cube",
  "depthcharge",
  "diamond",
  "dice",
  "digits",
  "evenwins",
  "flipflop",
  "football",
  "ftball",
  "furtrader",
  "gameofevenwins",
  "golf",
  "gomoko",
  "guess",
  "gunner",
  "hammurabi",
  "hangman",
  "hello",
  "hexapawn",
  "hi-lo",
  "highiq",
  "hockey",
  "horserace",
  "hurkle",
  "kinema",
  "king",
  "lem",
  "letter",
  "life",
  "lifefortwo",
  "litquiz",
  "love",
  "lunar",
  "mastermind",
  "mathdice",
  "mugwump",
  "name",
  "nicomachus",
  "nim",
  "number",
  "onecheck",
  "orbit",
  "pizza",
  "poetry",
  "poker",
  "qubit",
  "queen",
  "reverse",
  "rocket",
  "rockscissors",
  "roulette",
  "russianroulette",
  "salvo",
  "sinewave",
  "slalom",
  "slots",
  "splat",
  "stars",
  "stockmarket",
  "superstartrek",
  "superstartrekins",
  "synonym",
  "target",
  "test",
  "test1",
  "tictactoe1",
  "tower",
  "train",
  "trap",
  "war",
  "weekday",
  "word",
]);

const basicComputerGamesBwbasicOnly = new Set([
  "bagels",
  "banner",
  "bug",
  "flipflop",
  "golf",
  "lem",
  "letter",
  "orbit",
  "word",
]);

const basicComputerGamesRetrobasicOnly = new Set(["superstartrek"]);

const basicComputerGamesTitles = Object.freeze({
  "23matches": "23 Matches",
  "3dplot": "3D Plot",
  aceyducey: "Acey-Ducey",
  "hi-lo": "Hi-Lo",
  gameofevenwins: "Game of Even Wins",
  lifefortwo: "Life for Two",
  mathdice: "Math Dice",
  onecheck: "One Check",
  rockscissors: "Rock, Scissors, Paper",
  russianroulette: "Russian Roulette",
  sinewave: "Sine Wave",
  stockmarket: "Stock Market",
  superstartrek: "Super Star Trek",
  superstartrekins: "Super Star Trek Instructions",
  tictactoe1: "Tic-Tac-Toe I",
});

function titleFromFile(file) {
  return (
    basicComputerGamesTitles[file] ?? file[0].toUpperCase() + file.slice(1)
  );
}

const basicComputerGames = basicComputerGamesFiles.map((file) => [
  `bcg-${file}`,
  Object.freeze({
    id: `bcg-${file}`,
    title: titleFromFile(file),
    collection: "BASIC Computer Games",
    description: "A classic BASIC program verified to start in Basicade.",
    sourcePath: `examples/basic-computer-games/${file}.bas`,
    source: Object.freeze({
      url: "https://archive.org/details/Basic_Computer_Games_Microcomputer_Edition_1978_Creative_Computing",
      license: "Source provenance and licence record pending",
    }),
    interpreters: Object.freeze(
      basicComputerGamesBwbasicOnly.has(file)
        ? ["bwbasic"]
        : basicComputerGamesRetrobasicOnly.has(file)
          ? ["retrobasic"]
          : ["bwbasic", "retrobasic"],
    ),
    compatibility: "smoke-tested",
  }),
]);

export const games = Object.freeze({
  "oregon-trail": Object.freeze({
    id: "oregon-trail",
    title: "The Oregon Trail",
    collection: "Creative Computing Magazine",
    description: "The original BASIC edition of the trail survival classic.",
    route: "oregon-trail",
    sourcePath: "examples/creative-computing-magazine/oregon.bas",
    source: Object.freeze({
      url: "https://github.com/clintmoyer/oregon-trail",
      license: "Unlicense",
    }),
    interpreters: Object.freeze(["bwbasic", "retrobasic"]),
  }),
  ...Object.fromEntries(basic101Games),
  ...Object.fromEntries(basicComputerGames),
});

function routeGameId(pathname) {
  const route = pathname.split("/").filter(Boolean).at(-1);
  if (!route) return undefined;
  return Object.values(games).find((game) => game.route === route)?.id;
}

function basePathname(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length && routeGameId(`/${parts.at(-1)}/`)) parts.pop();
  return `/${parts.length ? `${parts.join("/")}/` : ""}`;
}

export function resolveSelection(search = "", pathname = "") {
  const params = new URLSearchParams(search);
  const requestedGameId = params.get("game") ?? routeGameId(pathname);
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
  const basePath = basePathname(url.pathname);

  if (game.route) {
    url.pathname = `${basePath}${game.route}/`;
    url.searchParams.delete("game");
    if (interpreter.id === DEFAULT_INTERPRETER_ID) {
      url.searchParams.delete("interpreter");
    } else {
      url.searchParams.set("interpreter", interpreter.id);
    }
  } else {
    url.pathname = basePath;
    url.searchParams.set("game", game.id);
    url.searchParams.set("interpreter", interpreter.id);
  }
  return url;
}
