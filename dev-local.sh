#!/usr/bin/env bash

# Sobe apenas o banco de dados no Docker
echo "==========================================="
echo "⚙️ Iniciando o Banco de Dados (PostgreSQL)..."
echo "==========================================="
docker compose up -d centroautomotivo_db

# Aguarda o banco subir
echo "Aguardando o banco iniciar..."
sleep 3

# Configura as variáveis de ambiente locais
# O docker expõe o banco na porta 5434 do host
export DATABASE_URL="postgresql://user:password@localhost:5434/automotivo_db"
export PORT="3000"
export VITE_API_URL="http://localhost:3000/api"

echo "==========================================="
echo "🚀 Iniciando Backend e Frontend (NATIVO)"
echo "==========================================="

# Função para matar os processos em background quando apertar Ctrl+C
cleanup() {
    echo ""
    echo "Encerrando servidores locais..."
    kill $API_PID $CLIENT_PID 2>/dev/null
    exit 0
}
trap cleanup EXIT INT TERM

# Inicia o Backend (API) no background
echo "Iniciando Backend na pasta ./server..."
cd server
npm install --no-fund --no-audit
npx prisma generate
npm run dev &
API_PID=$!
cd ..

# Inicia o Frontend (React/Vite) no background
echo "Iniciando Frontend na pasta ./client..."
cd client
npm install --no-fund --no-audit
npm run dev &
CLIENT_PID=$!
cd ..

echo "==========================================="
echo "✅ Ambiente Híbrido Rodando!"
echo "➡️  Frontend: http://localhost:5173"
echo "➡️  Backend:  http://localhost:3000"
echo "Para parar, pressione Ctrl + C"
echo "==========================================="

# Segura o script rodando para o trap do Ctrl+C funcionar
wait
