-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "nf_numero" VARCHAR(50),
ADD COLUMN     "nf_parcela" INTEGER,
ADD COLUMN     "nf_total_parcelas" INTEGER,
ADD COLUMN     "nf_boleto" VARCHAR(100);

-- AlterTable
ALTER TABLE "entrada_estoque" ADD COLUMN     "nf_numero" VARCHAR(50);

-- AlterTable
ALTER TABLE "pagamento_peca" ADD COLUMN     "nf_numero" VARCHAR(50);
