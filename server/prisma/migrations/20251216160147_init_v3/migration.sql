/*
  Warnings:

  - You are about to drop the column `qtd` on the `itens_os` table. All the data in the column will be lost.
  - You are about to drop the column `valor_unt` on the `itens_os` table. All the data in the column will be lost.
  - You are about to drop the `finalizacao` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `quantidade` to the `itens_os` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valor_venda` to the `itens_os` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "finalizacao" DROP CONSTRAINT "finalizacao_id_os_fkey";

-- AlterTable
ALTER TABLE "itens_os" DROP COLUMN "qtd",
DROP COLUMN "valor_unt",
ADD COLUMN     "quantidade" INTEGER NOT NULL,
ADD COLUMN     "valor_venda" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "ordem_de_servico" ADD COLUMN     "valor_mao_de_obra" DECIMAL(10,2),
ADD COLUMN     "valor_total_cliente" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "pecas_estoque" ADD COLUMN     "custo_unitario_padrao" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "finalizacao";

-- CreateTable
CREATE TABLE "fornecedor" (
    "id_fornecedor" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "documento" VARCHAR(20),
    "contato" VARCHAR(100),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id_fornecedor")
);

-- CreateTable
CREATE TABLE "pagamento_peca" (
    "id_pagamento_peca" SERIAL NOT NULL,
    "id_item_os" INTEGER NOT NULL,
    "id_fornecedor" INTEGER NOT NULL,
    "custo_real" DECIMAL(10,2) NOT NULL,
    "data_compra" TIMESTAMP NOT NULL,
    "data_pagamento_fornecedor" TIMESTAMP,
    "pago_ao_fornecedor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pagamento_peca_pkey" PRIMARY KEY ("id_pagamento_peca")
);

-- CreateTable
CREATE TABLE "fechamento_financeiro" (
    "id_fechamento_financeiro" SERIAL NOT NULL,
    "id_os" INTEGER NOT NULL,
    "custo_total_pecas_real" DECIMAL(10,2) NOT NULL,
    "data_fechamento_financeiro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fechamento_financeiro_pkey" PRIMARY KEY ("id_fechamento_financeiro")
);

-- CreateIndex
CREATE UNIQUE INDEX "fechamento_financeiro_id_os_key" ON "fechamento_financeiro"("id_os");

-- AddForeignKey
ALTER TABLE "pagamento_peca" ADD CONSTRAINT "pagamento_peca_id_item_os_fkey" FOREIGN KEY ("id_item_os") REFERENCES "itens_os"("id_iten") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_peca" ADD CONSTRAINT "pagamento_peca_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id_fornecedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_financeiro" ADD CONSTRAINT "fechamento_financeiro_id_os_fkey" FOREIGN KEY ("id_os") REFERENCES "ordem_de_servico"("id_os") ON DELETE RESTRICT ON UPDATE CASCADE;
