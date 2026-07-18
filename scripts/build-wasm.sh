#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$ROOT/wasm"
cd "$ROOT/interpreters/bwbasic"

emcc \
    bw*.c \
    -O3 \
    -o "$ROOT/wasm/bwbasic.js" \
    -sMODULARIZE=1 \
    -sEXPORT_ES6=1 \
    -sEXPORTED_RUNTIME_METHODS=FS,callMain \
    -sSINGLE_FILE=1 \
    -sEXIT_RUNTIME=1
