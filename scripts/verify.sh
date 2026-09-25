#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
export CI=1

bun install --frozen-lockfile
bun run check
bun run doctor
bun run export:ios
bun run worklets:check
