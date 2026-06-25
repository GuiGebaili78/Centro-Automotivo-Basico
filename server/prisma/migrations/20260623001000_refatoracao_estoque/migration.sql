-- AlterTable
ALTER TABLE "pecas_estoque" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "pecas_estoque" ADD COLUMN "referencias_equivalentes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pecas_estoque_nome_fabricante_ref_cod_key" ON "pecas_estoque"("nome", "fabricante", "ref_cod");
