#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$ROOT/wasm"

cd "$ROOT/src"

emcc \
    bw*.c \
    -O2 \
    -o "$ROOT/wasm/bwbasic.js" \
    -sMODULARIZE \
    -sEXPORT_ES6 \
    -sEXPORTED_RUNTIME_METHODS=FS,callMain
