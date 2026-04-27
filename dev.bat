@echo off
REM Sobe o ambiente de DEV local em Docker.
REM   - Frontend: http://localhost:5173
REM   - Backend:  http://localhost:3000
REM Em PROD, basta "docker compose up -d" (sem este script).

cd /d "%~dp0"
docker compose -f docker-compose.yml -f docker-compose.dev.yml up %*
