#!/bin/bash
# start-nativo.sh

# A porta agora é 5432 (nativo) e não 5434 (docker)
export DATABASE_URL="postgresql://user:password@localhost:5432/automotivo_db"
export PORT="3000"
export VITE_API_URL="http://localhost:3000/api"

echo "🚀 Iniciando Backend e Frontend Nativos..."

cd server && npm run dev &
API_PID=$!

cd client && npm run dev &
CLIENT_PID=$!

trap "kill $API_PID $CLIENT_PID; exit" EXIT INT TERM
wait