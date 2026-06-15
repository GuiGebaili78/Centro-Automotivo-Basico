#!/bin/bash
set -e

# Para o deploy na primeira falha (ex.: build quebrado) em vez de seguir adiante
# limpando imagem e te deixando sem feedback do que deu errado.

# 1. Sobe os serviços, rebuilda as imagens e remove containers órfãos.
#
#    --renew-anon-volumes (-V): RECRIA os volumes anônimos a cada deploy.
#    O `node_modules` do serviço `api` é um volume anônimo (ver docker-compose.yml).
#    Sem essa flag, o Docker REAPROVEITA o node_modules antigo do volume e tampa
#    o node_modules novo da imagem — então dependências novas do package.json
#    (ex.: dayjs) nunca chegam no container e a API quebra no boot.
#    Com a flag, o volume é recriado a partir da imagem recém-buildada (npm install).
#
#    SEGURO p/ o banco: o Postgres usa volume NOMEADO (postgres_data), que NÃO é
#    afetado por --renew-anon-volumes. Só volumes anônimos (node_modules) são recriados.
docker compose up -d --build --remove-orphans --renew-anon-volumes

# 2. Limpa imagens "dangling" (aquelas sem nome/tag que sobram do build)
docker image prune -f

# 3. Limpa o cache de build antigo (útil se o disco estiver muito cheio)
docker builder prune -f --filter "until=24h"

# 4. Mostra o status final pra você confirmar num relance que tudo subiu
#    (atenção especial ao serviço `api`: tem que aparecer como "Up").
docker compose ps
