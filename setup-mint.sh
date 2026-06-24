#!/bin/bash

echo "⚙️  Verificando e configurando ambiente nativo (Linux Mint/Ubuntu)..."

# 1. Atualizar repositórios
sudo apt update && sudo apt install -y curl wget gnupg2 software-properties-common

# 2. Verificar e Instalar Node.js 20 (via NVM)
if ! command -v nvm &> /dev/null; then
    echo "Instalando NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "Verificando Node.js v20..."
nvm install 20
nvm use 20
nvm alias default 20

# 3. Verificar e Instalar PostgreSQL 16
if ! psql -V 2>/dev/null | grep -q "16"; then
    echo "Instalando PostgreSQL 16..."
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null
    sudo apt update
    sudo apt install -y postgresql-16
fi

# 4. Configurar Banco de Dados e Usuário (Conforme docker-compose)
echo "Configurando credenciais do banco de dados..."
sudo -u postgres psql -c "CREATE USER \"user\" WITH PASSWORD 'password';" 2>/dev/null
sudo -u postgres psql -c "ALTER USER \"user\" CREATEDB;" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE automotivo_db OWNER \"user\";" 2>/dev/null

# 5. Instalar Pacotes npm e Prisma
echo "Instalando pacotes da Raiz..."
npm install

echo "Instalando pacotes do Backend (Server)..."
cd server || exit
npm install
# O Prisma é atualizado/instalado via package.json, aqui nós o geramos
npx prisma generate
npx prisma migrate dev
cd ..

echo "Instalando pacotes do Frontend (Client)..."
cd client || exit
npm install
cd ..

echo "✅ Ambiente nativo configurado com sucesso!"

echo "Instalando navegadores nativos para o Playwright (Restrito ao Chromium)..."
npx playwright install --with-deps chromium