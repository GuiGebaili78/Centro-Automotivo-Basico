#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

echo "======================================================="
echo "🚀 Iniciando Banco de Dados, Backend e Frontend (DOCKER)"
echo "======================================================="
echo "➡️  Frontend (Vite HMR): http://localhost:5173"
echo "➡️  Backend (API):       http://localhost:3000"
echo "➡️  Banco (Postgres):    localhost:5434"
echo "======================================================="
echo "Para parar, pressione Ctrl + C"
echo ""

docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up --build --renew-anon-volumes "$@"
