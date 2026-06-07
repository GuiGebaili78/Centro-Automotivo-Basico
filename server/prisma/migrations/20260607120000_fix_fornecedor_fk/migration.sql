-- DropForeignKey
ALTER TABLE "entrada_estoque" DROP CONSTRAINT "entrada_estoque_id_pessoa_fkey";

-- DropForeignKey
ALTER TABLE "pagamento_peca" DROP CONSTRAINT "pagamento_peca_id_pessoa_fkey";

-- AddForeignKey
ALTER TABLE "pagamento_peca" ADD CONSTRAINT "pagamento_peca_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "fornecedor"("id_fornecedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_estoque" ADD CONSTRAINT "entrada_estoque_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "fornecedor"("id_fornecedor") ON DELETE RESTRICT ON UPDATE CASCADE;
