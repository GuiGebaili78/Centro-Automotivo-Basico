-- Adicionar id_os e id_item_entrada para rastreabilidade em MovimentacaoEstoque
ALTER TABLE "movimentacao_estoque" ADD COLUMN "id_os" INTEGER;
ALTER TABLE "movimentacao_estoque" ADD COLUMN "id_item_entrada" INTEGER;

-- FK para OS (SetNull: ao deletar OS, o histórico é preservado)
ALTER TABLE "movimentacao_estoque"
  ADD CONSTRAINT "movimentacao_estoque_id_os_fkey"
  FOREIGN KEY ("id_os") REFERENCES "ordem_de_servico"("id_os")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FK para ItemEntrada (SetNull: ao deletar entrada, o histórico é preservado)
ALTER TABLE "movimentacao_estoque"
  ADD CONSTRAINT "movimentacao_estoque_id_item_entrada_fkey"
  FOREIGN KEY ("id_item_entrada") REFERENCES "item_entrada"("id_item_entrada")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "movimentacao_estoque_id_os_idx" ON "movimentacao_estoque"("id_os");
CREATE INDEX "movimentacao_estoque_id_item_entrada_idx" ON "movimentacao_estoque"("id_item_entrada");
