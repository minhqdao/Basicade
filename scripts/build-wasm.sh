#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$ROOT/build"

cd "$ROOT/src"

emcc \
    bw*.c \
    -O2 \
    -o "$ROOT/build/bwbasic.js" \
    -sMODULARIZE \
    -sEXPORT_ES6 \
    -sEXPORTED_RUNTIME_METHODS=FS,callMain
