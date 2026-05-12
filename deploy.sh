#!/bin/bash

# 1. Sobe os serviços novos, builda e remove containers de serviços que saíram do compose
docker compose up -d --build --remove-orphans

# 2. Limpa imagens "dangling" (aquelas sem nome/tag que sobram do build)
docker image prune -f

# 3. Opcional: Limpa o cache de build antigo (útil se o disco estiver muito cheio)
docker builder prune -f --filter "until=24h"