#!/bin/bash
# Script para popular o banco de dados com a estrutura alinhada (v2) sem gerar erros no Prisma

echo "1. Isolando a API (evita que o Prisma tente fazer migrações durante o restore)..."
docker compose stop api

echo "2. Zerando a estrutura atual do banco de dados..."
docker compose exec centroautomotivo_db psql -U user -d automotivo_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "3. Injetando o backup alinhado (backup_automotivo_v2.sql)..."
docker compose exec -T centroautomotivo_db psql -U user -d automotivo_db -v ON_ERROR_STOP=1 < backup_automotivo_v2.sql

echo "4. Reativando a API..."
docker compose start api

echo "Banco populado com sucesso com a estrutura 100% alinhada!"
