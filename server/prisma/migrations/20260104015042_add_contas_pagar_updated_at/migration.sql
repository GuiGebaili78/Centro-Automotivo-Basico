-- AlterTable
ALTER TABLE "ordem_de_servico" ADD COLUMN     "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id_conta_pagar" SERIAL NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dt_vencimento" DATE NOT NULL,
    "dt_pagamento" DATE,
    "status" VARCHAR(20) NOT NULL,
    "categoria" VARCHAR(50),
    "obs" VARCHAR(500),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id_conta_pagar")
);
