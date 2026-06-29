-- AlterEnum
ALTER TYPE "CondicaoPeca" ADD VALUE 'ORIGINAL';

-- AlterTable
ALTER TABLE "produto" ADD COLUMN "condicao" "CondicaoPeca" NOT NULL DEFAULT 'NOVO';

-- DropIndex
DROP INDEX "produto_nome_fabricante_modelo_key";

-- CreateIndex
CREATE UNIQUE INDEX "produto_nome_fabricante_modelo_condicao_key" ON "produto"("nome", "fabricante", "modelo", "condicao");
