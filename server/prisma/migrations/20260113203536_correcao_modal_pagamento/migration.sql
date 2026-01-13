-- AddForeignKey
ALTER TABLE "pagamento_cliente" ADD CONSTRAINT "pagamento_cliente_id_operadora_fkey" FOREIGN KEY ("id_operadora") REFERENCES "operadora_cartao"("id_operadora") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_cliente" ADD CONSTRAINT "pagamento_cliente_id_conta_bancaria_fkey" FOREIGN KEY ("id_conta_bancaria") REFERENCES "conta_bancaria"("id_conta") ON DELETE SET NULL ON UPDATE CASCADE;
