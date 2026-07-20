# Game sources

Each directory in this folder is a playable program in the Basicade launcher.
Programs keep their own `README.md` and licence or permission record because
their provenance may differ from the interpreter code around them.

## Adding a program

Use a stable, lowercase game ID for the directory and URL, for example
`examples/oregon-trail/`. Include:

- the original or faithfully sourced BASIC file;
- `README.md` with title, source URL, attribution, and any adaptation notes;
- `LICENSE`, `COPYING`, or a clear permission record; and
- a matching entry in [`demos/catalog.js`](../demos/catalog.js).

For the planned *101 BASIC Games* catalogue, verify redistribution rights for
each source before adding it. The age or availability of a program is not, on
its own, a licence to republish it.
