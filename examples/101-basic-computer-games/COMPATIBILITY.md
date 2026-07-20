# RetroBASIC compatibility

Smoke-tested with the native RetroBASIC build on 2026-07-20. A passing program
must print startup output and avoid an immediate interpreter error when standard
input is closed. This is deliberately a start-up check, not a full playthrough.

The following 39 programs are currently offered by the Basicade launcher:

`1CHECK`, `23MTCH`, `3DPLOT`, `ACEYDU`, `AMAZIN`, `BAGELS`, `BASKET`,
`BASBAL`, `BATNUM`, `BOAT`, `BOUNCE`, `BOWL`, `BOXING`, `BUZZWD`, `CHANGE`,
`CHEMST`, `CHIEF`, `CHOMP`, `DIAMND`, `DICE`, `DIGITS`, `EVEN`, `EVEN1`,
`FOOTBL`, `GOLF`, `GOMOKO`, `GUNNER`, `LITQZ`, `MATHD`, `MUGWUMP`, `NUMBER`,
`PIZZA`, `QUBIC`, `REVERSE`, `RUSROU`, `STARS`, `TICTAC`, `TRAP`, and
`WEKDAY`.

Fifteen of those programs use BASIC-PLUS's backslash statement separator.
RetroBASIC now recognizes that separator as a colon, so their original source
can remain unchanged.

Of the 108 imported `.bas` files, 42 parse successfully under RetroBASIC.
`BATTLE`, `POETRY`, and `QUEEN` parse but do not produce clean startup output;
the remaining 66 fail parsing because they use a different historical BASIC
dialect or unsupported syntax. They remain in this folder as source material,
but are intentionally not selectable until adapted and tested.

Run the verified smoke suite with:

```bash
make -C interpreters/RetroBASIC
node test/basic101-native-smoke.mjs
```
