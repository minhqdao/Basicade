// @ts-check

import { catalogManifest } from "./catalog-manifest.js";
import { compileCatalog } from "./catalog-schema.js";

const catalog = compileCatalog(catalogManifest);

export const DEFAULT_GAME_ID = catalog.defaultGameId;
export const DEFAULT_INTERPRETER_ID = catalog.defaultInterpreterId;
export const games = catalog.games;
export const interpreters = catalog.interpreters;

/** @param {string} pathname */
function routeGameId(pathname) {
  const route = pathname.split("/").filter(Boolean).at(-1);
  if (!route) return undefined;
  return Object.values(games).find((game) => game.route === route)?.id;
}

/** @param {string} pathname */
function basePathname(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts.at(-1);
  if (lastPart && routeGameId(`/${lastPart}/`)) parts.pop();
  return `/${parts.length ? `${parts.join("/")}/` : ""}`;
}

/**
 * @param {string} [search]
 * @param {string} [pathname]
 * @returns {import("./catalog-schema.js").CatalogSelection}
 */
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

/**
 * @param {URL | Location} location
 * @param {import("./catalog-schema.js").CatalogSelection} selection
 * @param {string} [applicationBase]
 * @returns {URL}
 */
export function selectionUrl(location, { game, interpreter }, applicationBase) {
  const url = new URL(location.href);
  const basePath = applicationBase
    ? new URL(applicationBase, url.origin).pathname
    : basePathname(url.pathname);

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
