-- ============================================================
-- Migration: add_movimentacao_estoque
-- Data: 2026-06-24
-- Descrição: Adiciona tabela de histórico de movimentações de
--            estoque com auditoria completa (id_usuario, snapshot
--            de nome, saldo anterior/atual) e FK real para Usuario
--            com onDelete: SetNull.
--
-- ATENÇÃO: Esta migration NÃO deve ser substituída por db push.
-- O uso de db push remove constraints nativas do PostgreSQL.
-- ============================================================

-- CreateTable: movimentacao_estoque
CREATE TABLE "movimentacao_estoque" (
    "id_movimentacao"       SERIAL       NOT NULL,
    "id_pecas_estoque"      INTEGER      NOT NULL,
    "id_usuario"            INTEGER,
    "nome_usuario_snapshot" VARCHAR(100),
    "tipo_movimento"        VARCHAR(20)  NOT NULL,
    "quantidade"            INTEGER      NOT NULL,
    "saldo_anterior"        INTEGER      NOT NULL,
    "saldo_atual"           INTEGER      NOT NULL,
    "valor_unitario"        DECIMAL(10,2),
    "origem"                VARCHAR(150),
    "obs"                   VARCHAR(500),
    "dt_movimentacao"       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id_movimentacao")
);

-- CreateIndex
CREATE INDEX "movimentacao_estoque_id_pecas_estoque_idx" ON "movimentacao_estoque"("id_pecas_estoque");
CREATE INDEX "movimentacao_estoque_id_usuario_idx" ON "movimentacao_estoque"("id_usuario");
CREATE INDEX "movimentacao_estoque_tipo_movimento_idx" ON "movimentacao_estoque"("tipo_movimento");
CREATE INDEX "movimentacao_estoque_dt_movimentacao_idx" ON "movimentacao_estoque"("dt_movimentacao");

-- AddForeignKey: movimentacao_estoque → pecas_estoque
ALTER TABLE "movimentacao_estoque"
    ADD CONSTRAINT "movimentacao_estoque_id_pecas_estoque_fkey"
    FOREIGN KEY ("id_pecas_estoque")
    REFERENCES "pecas_estoque"("id_pecas_estoque")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: movimentacao_estoque → usuario (onDelete: SetNull)
-- Ao deletar um usuário, id_usuario vira NULL mas nome_usuario_snapshot
-- permanece como prova documental permanente.
ALTER TABLE "movimentacao_estoque"
    ADD CONSTRAINT "movimentacao_estoque_id_usuario_fkey"
    FOREIGN KEY ("id_usuario")
    REFERENCES "Usuario"("id_usuario")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================
-- CHECK CONSTRAINT: Prevenção de Saldo Negativo no Banco
-- Esta é a última linha de defesa. Mesmo que a aplicação falhe,
-- o banco rejeita qualquer UPDATE que deixe o estoque abaixo de 0.
-- PROIBIDO remover esta constraint via db push ou reset.
-- ===========================================================
ALTER TABLE "pecas_estoque"
    ADD CONSTRAINT "pecas_estoque_estoque_nao_negativo"
    CHECK ("estoque_atual" >= 0);
