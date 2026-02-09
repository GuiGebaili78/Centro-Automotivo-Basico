comando para gerar script de banco de dados

docker exec -t appcentroautomotivo-centroautomotivo_db-1 pg_dump -U user -a --column-inserts --disable-triggers --exclude-table=audit_log automotivo_db | Out-File -Encoding utf8 dados_oficina.sql