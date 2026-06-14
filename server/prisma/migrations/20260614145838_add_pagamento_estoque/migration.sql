-- AlterTable
ALTER TABLE "entrada_estoque" ADD COLUMN     "data_pagamento_fornecedor" TIMESTAMP(6),
ADD COLUMN     "pago_ao_fornecedor" BOOLEAN NOT NULL DEFAULT false;
