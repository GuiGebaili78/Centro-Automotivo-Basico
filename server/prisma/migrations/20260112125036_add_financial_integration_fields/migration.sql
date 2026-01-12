/*
  Warnings:

  - A unique constraint covering the columns `[id_livro_caixa]` on the table `pagamento_cliente` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_livro_caixa]` on the table `pagamento_peca` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "conta_bancaria" ADD COLUMN     "vincular_caixa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "operadora_cartao" ADD COLUMN     "vincular_caixa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pagamento_cliente" ADD COLUMN     "id_livro_caixa" INTEGER,
ADD COLUMN     "id_operadora" INTEGER;

-- AlterTable
ALTER TABLE "pagamento_peca" ADD COLUMN     "id_livro_caixa" INTEGER;

-- AlterTable
ALTER TABLE "recebivel_cartao" ADD COLUMN     "confirmado_em" TIMESTAMP,
ADD COLUMN     "confirmado_por" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_cliente_id_livro_caixa_key" ON "pagamento_cliente"("id_livro_caixa");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_peca_id_livro_caixa_key" ON "pagamento_peca"("id_livro_caixa");

-- AddForeignKey
ALTER TABLE "pagamento_peca" ADD CONSTRAINT "pagamento_peca_id_livro_caixa_fkey" FOREIGN KEY ("id_livro_caixa") REFERENCES "livro_caixa"("id_livro_caixa") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_cliente" ADD CONSTRAINT "pagamento_cliente_id_livro_caixa_fkey" FOREIGN KEY ("id_livro_caixa") REFERENCES "livro_caixa"("id_livro_caixa") ON DELETE SET NULL ON UPDATE CASCADE;
