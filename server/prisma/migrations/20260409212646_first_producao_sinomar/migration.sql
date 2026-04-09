/*
  Warnings:

  - You are about to drop the column `id_fornecedor` on the `entrada_estoque` table. All the data in the column will be lost.
  - You are about to drop the column `id_fornecedor` on the `pagamento_peca` table. All the data in the column will be lost.
  - You are about to drop the `fornecedor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `taxa_cartao` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `id_pessoa` to the `entrada_estoque` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_pessoa` to the `pagamento_peca` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PerfilAcesso" AS ENUM ('ADMIN', 'ATENDENTE', 'MECANICO');

-- DropForeignKey
ALTER TABLE "entrada_estoque" DROP CONSTRAINT "entrada_estoque_id_fornecedor_fkey";

-- DropForeignKey
ALTER TABLE "ordem_de_servico" DROP CONSTRAINT "ordem_de_servico_id_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "pagamento_peca" DROP CONSTRAINT "pagamento_peca_id_fornecedor_fkey";

-- DropForeignKey
ALTER TABLE "taxa_cartao" DROP CONSTRAINT "taxa_cartao_id_operadora_fkey";

-- DropIndex
DROP INDEX "fechamento_financeiro_id_os_key";

-- DropIndex
DROP INDEX "pagamento_cliente_id_livro_caixa_key";

-- DropIndex
DROP INDEX "pagamento_peca_id_livro_caixa_key";

-- DropIndex
DROP INDEX "pessoa_juridica_cnpj_key";

-- DropIndex
DROP INDEX "veiculo_placa_key";

-- AlterTable
ALTER TABLE "configuracao" ADD COLUMN     "inscricaoEstadual" VARCHAR(20),
ADD COLUMN     "smtpHost" VARCHAR(100),
ADD COLUMN     "smtpPass" VARCHAR(100),
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpUser" VARCHAR(100);

-- AlterTable
ALTER TABLE "entrada_estoque" DROP COLUMN "id_fornecedor",
ADD COLUMN     "id_pessoa" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "fechamento_financeiro" ADD COLUMN     "lucro_mao_de_obra" DECIMAL(10,2),
ADD COLUMN     "lucro_pecas" DECIMAL(10,2),
ADD COLUMN     "lucro_total" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "itens_os" ADD COLUMN     "is_interno" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ordem_de_servico" ADD COLUMN     "id_equipamento" INTEGER,
ADD COLUMN     "obs_interna" VARCHAR(1000),
ALTER COLUMN "id_veiculo" DROP NOT NULL,
ALTER COLUMN "km_entrada" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pagamento_peca" DROP COLUMN "id_fornecedor",
ADD COLUMN     "id_pessoa" INTEGER NOT NULL,
ADD COLUMN     "valor_desconto_rateado" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "pecas_estoque" ADD COLUMN     "estoque_minimo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "pessoa" ADD COLUMN     "is_cliente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_colaborador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_fornecedor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "veiculo" ADD COLUMN     "ano_fabricacao" VARCHAR(10);

-- DropTable
DROP TABLE "fornecedor";

-- DropTable
DROP TABLE "taxa_cartao";

-- CreateTable
CREATE TABLE "equipamento_cliente" (
    "id_equipamento" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "nome_peca" VARCHAR(100) NOT NULL,
    "fabricante" VARCHAR(50),
    "numeracao" VARCHAR(50),
    "observacoes" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipamento_cliente_pkey" PRIMARY KEY ("id_equipamento")
);

-- CreateTable
CREATE TABLE "taxa_operadora_cartao" (
    "id_taxa" SERIAL NOT NULL,
    "id_operadora" INTEGER NOT NULL,
    "modalidade" VARCHAR(20) NOT NULL,
    "parcela" INTEGER NOT NULL,
    "taxa_base_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxa_juros_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxa_antecipacao" DECIMAL(5,2) DEFAULT 0,

    CONSTRAINT "taxa_operadora_cartao_pkey" PRIMARY KEY ("id_taxa")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "PerfilAcesso" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxa_operadora_cartao_id_operadora_modalidade_parcela_key" ON "taxa_operadora_cartao"("id_operadora", "modalidade", "parcela");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "ordem_de_servico_id_equipamento_idx" ON "ordem_de_servico"("id_equipamento");

-- AddForeignKey
ALTER TABLE "equipamento_cliente" ADD CONSTRAINT "equipamento_cliente_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_id_veiculo_fkey" FOREIGN KEY ("id_veiculo") REFERENCES "veiculo"("id_veiculo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_id_equipamento_fkey" FOREIGN KEY ("id_equipamento") REFERENCES "equipamento_cliente"("id_equipamento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_peca" ADD CONSTRAINT "pagamento_peca_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "pessoa"("id_pessoa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_estoque" ADD CONSTRAINT "entrada_estoque_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "pessoa"("id_pessoa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxa_operadora_cartao" ADD CONSTRAINT "taxa_operadora_cartao_id_operadora_fkey" FOREIGN KEY ("id_operadora") REFERENCES "operadora_cartao"("id_operadora") ON DELETE RESTRICT ON UPDATE CASCADE;
