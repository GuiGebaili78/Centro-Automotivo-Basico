-- AlterTable
ALTER TABLE "pagamento_cliente" ADD COLUMN     "tipo_parcelamento" VARCHAR(20) DEFAULT 'LOJA';

-- AlterTable
ALTER TABLE "recebivel_cartao" ADD COLUMN     "tipo_parcelamento" VARCHAR(20) DEFAULT 'LOJA';

-- CreateTable
CREATE TABLE "taxa_cartao" (
    "id_taxa" SERIAL NOT NULL,
    "id_operadora" INTEGER NOT NULL,
    "modalidade" VARCHAR(20) NOT NULL,
    "num_parcelas" INTEGER NOT NULL,
    "taxa_total" DECIMAL(5,2) NOT NULL,
    "taxa_antecipacao" DECIMAL(5,2) DEFAULT 0,

    CONSTRAINT "taxa_cartao_pkey" PRIMARY KEY ("id_taxa")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxa_cartao_id_operadora_modalidade_num_parcelas_key" ON "taxa_cartao"("id_operadora", "modalidade", "num_parcelas");

-- AddForeignKey
ALTER TABLE "taxa_cartao" ADD CONSTRAINT "taxa_cartao_id_operadora_fkey" FOREIGN KEY ("id_operadora") REFERENCES "operadora_cartao"("id_operadora") ON DELETE RESTRICT ON UPDATE CASCADE;
