#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/../../interpreters/RetroBASIC/src"

mkdir -p "$ROOT/wasm"

# Generate lex/yacc sources
cd "$SRC_DIR"
BISON="${BISON:-bison}"
FLEX="${FLEX:-flex}"
"$BISON" -d -o parse.tab.c parse.y
cp parse.tab.h parse.h
"$FLEX" -o lex.yy.c scan.l

# Compile to WASM
# -include sys/time.h: statistics.h forward-declares struct timeval without
# including its definition, which newer Emscripten sysroots (6.0.10, vs the
# 6.0.6 pinned in CI) reject. Pre-including the header works on both.
emcc \
    -include sys/time.h \
    main.c retrobasic.c errors.c format.c io.c list.c list_output.c \
    matrix.c statistics.c strng.c cli.c \
    parse.tab.c lex.yy.c \
    -O3 \
    -I "$SRC_DIR" \
    -o "$ROOT/wasm/retrobasic.js" \
    -sMODULARIZE=1 \
    -sEXPORT_ES6=1 \
    -sEXPORTED_RUNTIME_METHODS=FS,callMain \
    -sSINGLE_FILE=1 \
    -sEXIT_RUNTIME=1
