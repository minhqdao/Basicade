// @ts-check

/** @returns {never} */
function fail(path, message) {
  throw new TypeError(`Invalid catalog manifest at ${path}: ${message}`);
}

function record(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "expected an object");
  }
  return /** @type {Record<string, unknown>} */ (value);
}

function string(value, path) {
  if (typeof value !== "string" || !value) fail(path, "expected a string");
  return /** @type {string} */ (value);
}

function stringArray(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(path, "expected a non-empty string array");
  }
  return value.map((entry, index) => string(entry, `${path}[${index}]`));
}

function optionalString(value, path) {
  return value === undefined ? undefined : string(value, path);
}

function source(value, path) {
  const item = record(value, path);
  return Object.freeze({
    url: string(item.url, `${path}.url`),
    license: string(item.license, `${path}.license`),
  });
}

function title(file, titles, style) {
  const override = titles[file];
  if (override !== undefined) return string(override, `titles.${file}`);
  return style === "uppercase"
    ? file.toUpperCase()
    : file[0].toUpperCase() + file.slice(1);
}

function routeSlug(value, path) {
  const slug = string(value, path)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) fail(path, "expected a route-safe name");
  return slug;
}

function freezeGame(value, path, interpreterIds) {
  const game = record(value, path);
  const interpreters = stringArray(game.interpreters, `${path}.interpreters`);
  for (const interpreter of interpreters) {
    if (!interpreterIds.has(interpreter)) {
      fail(`${path}.interpreters`, `unknown interpreter ${interpreter}`);
    }
  }

  const frozen = {
    id: string(game.id, `${path}.id`),
    title: string(game.title, `${path}.title`),
    collection: string(game.collection, `${path}.collection`),
    description: string(game.description, `${path}.description`),
    route: string(game.route, `${path}.route`),
    sourcePath: string(game.sourcePath, `${path}.sourcePath`),
    source: source(game.source, `${path}.source`),
    interpreters: Object.freeze(interpreters),
    compatibility: optionalString(game.compatibility, `${path}.compatibility`),
  };
  if (!/^examples\/[a-z0-9-]+\/[a-z0-9-]+\.bas$/.test(frozen.sourcePath)) {
    fail(`${path}.sourcePath`, "expected a normalized examples/*.bas path");
  }
  return Object.freeze(frozen);
}

/** Validates and compiles the declarative catalog into launcher-ready records. */
export function compileCatalog(value) {
  const manifest = record(value, "catalog");
  if (manifest.schemaVersion !== 1) fail("catalog.schemaVersion", "expected 1");

  const manifestInterpreters = manifest.interpreters;
  if (!Array.isArray(manifestInterpreters)) {
    fail("catalog.interpreters", "expected an array");
  }
  const interpreterEntries = manifestInterpreters.map((value, index) => {
    const item = record(value, `catalog.interpreters[${index}]`);
    const interpreter = Object.freeze({
      id: string(item.id, `catalog.interpreters[${index}].id`),
      name: string(item.name, `catalog.interpreters[${index}].name`),
      wasmPath: string(
        item.wasmPath,
        `catalog.interpreters[${index}].wasmPath`,
      ),
    });
    return [interpreter.id, interpreter];
  });
  const interpreters = Object.freeze(Object.fromEntries(interpreterEntries));
  const interpreterIds = new Set(Object.keys(interpreters));
  if (interpreterIds.size !== interpreterEntries.length) {
    fail("catalog.interpreters", "interpreter IDs must be unique");
  }

  const gameValues = Array.isArray(manifest.games) ? [...manifest.games] : [];
  const generatedCollections = manifest.generatedCollections;
  if (!Array.isArray(generatedCollections)) {
    fail("catalog.generatedCollections", "expected an array");
  }
  const collections = generatedCollections
    .map((value, index) => ({
      value: record(value, `catalog.generatedCollections[${index}]`),
      index,
    }))
    .sort(
      (left, right) => Number(left.value.order) - Number(right.value.order),
    );

  for (const { value: collection, index } of collections) {
    const path = `catalog.generatedCollections[${index}]`;
    const files = stringArray(collection.files, `${path}.files`);
    if (new Set(files).size !== files.length) {
      fail(`${path}.files`, "filenames must be unique");
    }
    const titles =
      collection.titles === undefined
        ? {}
        : record(collection.titles, `${path}.titles`);
    const overrides =
      collection.interpreterOverrides === undefined
        ? {}
        : record(
            collection.interpreterOverrides,
            `${path}.interpreterOverrides`,
          );
    const routeNames =
      collection.routeNames === undefined
        ? {}
        : record(collection.routeNames, `${path}.routeNames`);
    for (const override of [
      ...Object.keys(titles),
      ...Object.keys(overrides),
      ...Object.keys(routeNames),
    ]) {
      if (!files.includes(override)) {
        fail(path, `override refers to unlisted file ${override}`);
      }
    }

    const idPrefix = string(collection.idPrefix, `${path}.idPrefix`);
    const routePrefix = routeSlug(
      collection.routePrefix,
      `${path}.routePrefix`,
    );
    const sourceDirectory = string(
      collection.sourceDirectory,
      `${path}.sourceDirectory`,
    );
    const defaultInterpreters = stringArray(
      collection.interpreters,
      `${path}.interpreters`,
    );
    const titleStyle = string(collection.titleStyle, `${path}.titleStyle`);
    if (!new Set(["capitalize", "uppercase"]).has(titleStyle)) {
      fail(`${path}.titleStyle`, "expected capitalize or uppercase");
    }
    const collectionSource = source(collection.source, `${path}.source`);

    for (const file of files) {
      const gameTitle = title(file, titles, titleStyle);
      const routeName =
        routeNames[file] === undefined
          ? routeSlug(gameTitle, `${path}.titles.${file}`)
          : routeSlug(routeNames[file], `${path}.routeNames.${file}`);
      gameValues.push({
        id: `${idPrefix}${file}`,
        title: gameTitle,
        route: `${routePrefix}-${routeName}`,
        collection: string(collection.collection, `${path}.collection`),
        description: string(collection.description, `${path}.description`),
        sourcePath: `${sourceDirectory}/${file}.bas`,
        source: collectionSource,
        interpreters:
          overrides[file] === undefined
            ? defaultInterpreters
            : stringArray(
                overrides[file],
                `${path}.interpreterOverrides.${file}`,
              ),
        compatibility: optionalString(
          collection.compatibility,
          `${path}.compatibility`,
        ),
      });
    }
  }

  const gameEntries = gameValues.map((game, index) => {
    const frozen = freezeGame(game, `catalog.games[${index}]`, interpreterIds);
    return [frozen.id, frozen];
  });
  const games = Object.freeze(Object.fromEntries(gameEntries));
  if (Object.keys(games).length !== gameEntries.length) {
    fail("catalog.games", "game IDs must be unique");
  }
  const routes = Object.values(games).map((game) => game.route);
  if (new Set(routes).size !== routes.length) {
    fail("catalog.games", "routes must be unique");
  }

  const defaultGameId = string(manifest.defaultGameId, "catalog.defaultGameId");
  const defaultInterpreterId = string(
    manifest.defaultInterpreterId,
    "catalog.defaultInterpreterId",
  );
  if (!games[defaultGameId]) fail("catalog.defaultGameId", "unknown game");
  if (!interpreters[defaultInterpreterId]) {
    fail("catalog.defaultInterpreterId", "unknown interpreter");
  }

  return Object.freeze({
    defaultGameId,
    defaultInterpreterId,
    games,
    interpreters,
  });
}
