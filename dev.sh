#!/usr/bin/env bash
# Sobe o ambiente de DEV local em Docker.
#   - Frontend: http://localhost:5173
#   - Backend:  http://localhost:3000
# Em PROD, basta "docker compose up -d" (sem este script).

set -euo pipefail

cd "$(dirname "$0")"

docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up "$@"
