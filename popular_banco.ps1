# Script PowerShell para popular o banco de dados com a estrutura alinhada (v2) sem gerar erros no Prisma

Write-Host "1. Isolando a API (evita que o Prisma tente fazer migrações durante o restore)..." -ForegroundColor Cyan
docker compose stop api

Write-Host "2. Zerando a estrutura atual do banco de dados..." -ForegroundColor Cyan
docker compose exec centroautomotivo_db psql -U user -d automotivo_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

Write-Host "3. Injetando o backup alinhado (backup_automotivo_v2.sql)..." -ForegroundColor Cyan
# Em PowerShell, o comando '<' não é nativamente suportado no docker exec, então copiamos o arquivo e rodamos internamente:
docker cp backup_automotivo_v2.sql appcentroautomotivo-centroautomotivo_db-1:/tmp/backup_automotivo_v2.sql
docker compose exec centroautomotivo_db psql -U user -d automotivo_db -v ON_ERROR_STOP=1 -f /tmp/backup_automotivo_v2.sql

Write-Host "4. Reativando a API..." -ForegroundColor Cyan
docker compose start api

Write-Host "Banco populado com sucesso com a estrutura 100% alinhada!" -ForegroundColor Green
