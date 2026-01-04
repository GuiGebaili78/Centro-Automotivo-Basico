-- CreateIndex
CREATE INDEX "ordem_de_servico_id_cliente_idx" ON "ordem_de_servico"("id_cliente");

-- CreateIndex
CREATE INDEX "ordem_de_servico_id_veiculo_idx" ON "ordem_de_servico"("id_veiculo");

-- CreateIndex
CREATE INDEX "ordem_de_servico_status_idx" ON "ordem_de_servico"("status");

-- CreateIndex
CREATE INDEX "ordem_de_servico_deleted_at_idx" ON "ordem_de_servico"("deleted_at");
