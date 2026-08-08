import { games } from "./catalog.js";

export const staticRoutes = Object.freeze(
  Object.values(games).map((game) => game.route),
);
