#!/bin/bash
# Simple startup script
export PATH="/nix/store/dj805sw07vvpbxx39c8g67x8qddg0ikw-nodejs-18.12.1/bin:$PATH"
cd "$(dirname "$0")"
exec npx tsx server/index.ts
