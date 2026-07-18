#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/../../interpreters/RetroBASIC/src"

mkdir -p "$ROOT/wasm"

# Generate lex/yacc sources
cd "$SRC_DIR"
bison -d -o parse.tab.c parse.y
cp parse.tab.h parse.h
flex -o lex.yy.c scan.l

# Compile to WASM
emcc \
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
