-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN "id_fornecedor" INTEGER;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id_fornecedor") ON DELETE SET NULL ON UPDATE CASCADE;
