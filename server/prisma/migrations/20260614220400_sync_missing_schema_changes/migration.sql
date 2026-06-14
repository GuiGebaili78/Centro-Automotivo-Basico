-- DropForeignKey
ALTER TABLE "pagamento_peca" DROP CONSTRAINT "pagamento_peca_id_pessoa_fkey";

-- DropForeignKey
ALTER TABLE "recebivel_cartao" DROP CONSTRAINT "recebivel_cartao_id_operadora_fkey";

-- AlterTable
ALTER TABLE "configuracao" ADD COLUMN     "logoImpressaoUrl" VARCHAR(500),
ADD COLUMN     "telefone2" VARCHAR(20);

-- AlterTable
ALTER TABLE "recebivel_cartao" ALTER COLUMN "id_operadora" DROP NOT NULL;

-- CreateTable
CREATE TABLE "registro_diaria" (
    "id_registro" SERIAL NOT NULL,
    "id_funcionario" INTEGER NOT NULL,
    "data_trabalho" DATE NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "valor_diaria" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "registro_diaria_pkey" PRIMARY KEY ("id_registro")
);

-- CreateIndex
CREATE UNIQUE INDEX "registro_diaria_id_funcionario_data_trabalho_key" ON "registro_diaria"("id_funcionario", "data_trabalho");

-- AddForeignKey
ALTER TABLE "registro_diaria" ADD CONSTRAINT "registro_diaria_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_peca" ADD CONSTRAINT "pagamento_peca_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "fornecedor"("id_fornecedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebivel_cartao" ADD CONSTRAINT "recebivel_cartao_id_operadora_fkey" FOREIGN KEY ("id_operadora") REFERENCES "operadora_cartao"("id_operadora") ON DELETE SET NULL ON UPDATE CASCADE;
