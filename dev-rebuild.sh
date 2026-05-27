#!/usr/bin/env bash
# Sobe o ambiente de DEV local reconstruindo as imagens do zero.
# Útil quando há alterações no package.json ou Dockerfile.

set -euo pipefail

cd "$(dirname "$0")"

docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up --build "$@"
