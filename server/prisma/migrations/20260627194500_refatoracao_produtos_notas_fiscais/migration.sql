-- =============================================================================
-- Continuação da migração 20260627194500 — executado após dados do produto
-- serem limpos. Continua do ponto que falhou (CREATE UNIQUE INDEX).
-- =============================================================================

-- Índice único (agora sem duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS "produto_nome_fabricante_modelo_key"
    ON "produto"("nome", "fabricante", "modelo");

-- ===========================================================================
-- contas_pagar: adiciona colunas FK novas
-- ===========================================================================
ALTER TABLE "contas_pagar"
    ADD COLUMN IF NOT EXISTS "id_movimentacao" INTEGER,
    ADD COLUMN IF NOT EXISTS "id_nota_fiscal" INTEGER;

-- ===========================================================================
-- itens_os: migra id_pecas_estoque → id_produto
-- ===========================================================================
ALTER TABLE "itens_os" ADD COLUMN IF NOT EXISTS "id_produto" INTEGER;

-- Migra os valores existentes (mesmos IDs)
UPDATE "itens_os"
SET "id_produto" = "id_pecas_estoque"
WHERE "id_pecas_estoque" IS NOT NULL AND "id_produto" IS NULL;

-- Remove a FK e a coluna antiga
ALTER TABLE "itens_os" DROP CONSTRAINT IF EXISTS "itens_os_id_pecas_estoque_fkey";
ALTER TABLE "itens_os" DROP COLUMN IF EXISTS "id_pecas_estoque";

-- ===========================================================================
-- movimentacao_estoque: reestruturação completa
-- ===========================================================================

-- Remove FKs e índices antigos
ALTER TABLE "movimentacao_estoque" DROP CONSTRAINT IF EXISTS "movimentacao_estoque_id_item_entrada_fkey";
ALTER TABLE "movimentacao_estoque" DROP CONSTRAINT IF EXISTS "movimentacao_estoque_id_pecas_estoque_fkey";

DROP INDEX IF EXISTS "movimentacao_estoque_dt_movimentacao_idx";
DROP INDEX IF EXISTS "movimentacao_estoque_id_item_entrada_idx";
DROP INDEX IF EXISTS "movimentacao_estoque_id_pecas_estoque_idx";
DROP INDEX IF EXISTS "movimentacao_estoque_tipo_movimento_idx";

-- Limpa os dados de movimentacao (era apenas 1 registro de teste)
TRUNCATE TABLE "movimentacao_estoque";

-- Adiciona novas colunas
ALTER TABLE "movimentacao_estoque"
    ADD COLUMN IF NOT EXISTS "produto_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "custo_unitario_historico" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "preco_venda_historico" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "data_movimentacao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "data_pagamento_previsto" DATE,
    ADD COLUMN IF NOT EXISTS "nota_fiscal_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "tipo" "TipoMovimentacao";

-- Define NOT NULL e defaults para produto_id após o TRUNCATE
ALTER TABLE "movimentacao_estoque"
    ALTER COLUMN "produto_id" SET DEFAULT 0,
    ALTER COLUMN "saldo_anterior" SET DEFAULT 0,
    ALTER COLUMN "saldo_atual" SET DEFAULT 0;

-- Remove colunas antigas
ALTER TABLE "movimentacao_estoque"
    DROP COLUMN IF EXISTS "dt_movimentacao",
    DROP COLUMN IF EXISTS "id_item_entrada",
    DROP COLUMN IF EXISTS "id_pecas_estoque",
    DROP COLUMN IF EXISTS "tipo_movimento",
    DROP COLUMN IF EXISTS "valor_unitario";

-- Agora torna produto_id NOT NULL e remove o default temporário
ALTER TABLE "movimentacao_estoque"
    ALTER COLUMN "produto_id" SET NOT NULL,
    ALTER COLUMN "produto_id" DROP DEFAULT,
    ALTER COLUMN "tipo" SET NOT NULL;

-- ===========================================================================
-- Dropar tabelas antigas (CASCADE para limpar dependências residuais)
-- ===========================================================================
DROP TABLE IF EXISTS "item_entrada" CASCADE;
DROP TABLE IF EXISTS "entrada_estoque" CASCADE;
DROP TABLE IF EXISTS "pecas_estoque" CASCADE;

-- ===========================================================================
-- Índices novos em movimentacao_estoque
-- ===========================================================================
CREATE INDEX IF NOT EXISTS "movimentacao_estoque_produto_id_idx" ON "movimentacao_estoque"("produto_id");
CREATE INDEX IF NOT EXISTS "movimentacao_estoque_tipo_idx" ON "movimentacao_estoque"("tipo");
CREATE INDEX IF NOT EXISTS "movimentacao_estoque_data_movimentacao_idx" ON "movimentacao_estoque"("data_movimentacao");
CREATE INDEX IF NOT EXISTS "movimentacao_estoque_nota_fiscal_id_idx" ON "movimentacao_estoque"("nota_fiscal_id");

-- ===========================================================================
-- FKs finais
-- ===========================================================================
ALTER TABLE "produto"
    ADD CONSTRAINT "produto_id_categoria_fkey"
    FOREIGN KEY ("id_categoria") REFERENCES "categoria_estoque"("id_categoria")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "itens_os"
    ADD CONSTRAINT "itens_os_id_produto_fkey"
    FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contas_pagar"
    ADD CONSTRAINT "contas_pagar_id_nota_fiscal_fkey"
    FOREIGN KEY ("id_nota_fiscal") REFERENCES "nota_fiscal"("id_nota_fiscal")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contas_pagar"
    ADD CONSTRAINT "contas_pagar_id_movimentacao_fkey"
    FOREIGN KEY ("id_movimentacao") REFERENCES "movimentacao_estoque"("id_movimentacao")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nota_fiscal"
    ADD CONSTRAINT "nota_fiscal_id_fornecedor_fkey"
    FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id_fornecedor")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "movimentacao_estoque"
    ADD CONSTRAINT "movimentacao_estoque_produto_id_fkey"
    FOREIGN KEY ("produto_id") REFERENCES "produto"("id_produto")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimentacao_estoque"
    ADD CONSTRAINT "movimentacao_estoque_nota_fiscal_id_fkey"
    FOREIGN KEY ("nota_fiscal_id") REFERENCES "nota_fiscal"("id_nota_fiscal")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Marcar migração como concluída no histórico do Prisma
-- ===========================================================================
UPDATE _prisma_migrations
SET
    finished_at = NOW(),
    rolled_back_at = NULL,
    applied_steps_count = 1,
    logs = NULL
WHERE migration_name = '20260627194500_refatoracao_produtos_notas_fiscais';
