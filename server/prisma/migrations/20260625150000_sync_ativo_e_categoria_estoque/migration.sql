-- ============================================================
-- Sincroniza o banco com o schema após o merge da branch
-- `otimizacao-clientes`.
--
-- Estas alterações foram aplicadas via `db push` no ambiente
-- local e NUNCA viraram migration, então produção (que roda
-- `prisma migrate deploy`) ficou sem as colunas e quebrava com
-- P2022, ex.: "column cliente.ativo does not exist".
--
-- Tudo é idempotente (ADD COLUMN IF NOT EXISTS / CREATE ... IF
-- NOT EXISTS / guard de constraint) para ser seguro mesmo que o
-- banco já tenha parte das alterações.
-- ============================================================

-- 1. Coluna `ativo` (flag ativo/inativo) nos cadastros
ALTER TABLE "pessoa"              ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "pessoa_fisica"       ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "pessoa_juridica"     ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "cliente"             ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "equipamento_cliente" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "veiculo"             ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

-- 2. Nova tabela de categorias de estoque
CREATE TABLE IF NOT EXISTS "categoria_estoque" (
    "id_categoria" SERIAL NOT NULL,
    "nome"         VARCHAR(100) NOT NULL,
    "ativo"        BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categoria_estoque_pkey" PRIMARY KEY ("id_categoria")
);
CREATE UNIQUE INDEX IF NOT EXISTS "categoria_estoque_nome_key" ON "categoria_estoque"("nome");

-- 3. Novos campos de pecas_estoque ligados à categoria
ALTER TABLE "pecas_estoque" ADD COLUMN IF NOT EXISTS "modelo"       VARCHAR(100);
ALTER TABLE "pecas_estoque" ADD COLUMN IF NOT EXISTS "id_categoria" INTEGER;

-- FK pecas_estoque -> categoria_estoque (onDelete: SetNull, padrão Prisma p/ relação opcional)
DO $$ BEGIN
  ALTER TABLE "pecas_estoque"
    ADD CONSTRAINT "pecas_estoque_id_categoria_fkey"
    FOREIGN KEY ("id_categoria") REFERENCES "categoria_estoque"("id_categoria")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
