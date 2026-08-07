// @ts-check

import { catalogManifest } from "./catalog-manifest.js";
import { compileCatalog } from "./catalog-schema.js";

const catalog = compileCatalog(catalogManifest);

export const DEFAULT_GAME_ID = catalog.defaultGameId;
export const DEFAULT_INTERPRETER_ID = catalog.defaultInterpreterId;
export const games = catalog.games;
export const interpreters = catalog.interpreters;

function routeGameId(pathname) {
  const route = pathname.split("/").filter(Boolean).at(-1);
  if (!route) return undefined;
  return Object.values(games).find((game) => game.route === route)?.id;
}

function basePathname(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts.at(-1);
  if (lastPart && routeGameId(`/${lastPart}/`)) parts.pop();
  return `/${parts.length ? `${parts.join("/")}/` : ""}`;
}

export function resolveSelection(search = "", pathname = "") {
  const params = new URLSearchParams(search);
  const requestedGameId = params.get("game") ?? routeGameId(pathname);
  const game =
    (requestedGameId ? games[requestedGameId] : undefined) ??
    games[DEFAULT_GAME_ID];
  const requestedInterpreterId = params.get("interpreter");
  const interpreterId =
    requestedInterpreterId && game.interpreters.includes(requestedInterpreterId)
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
