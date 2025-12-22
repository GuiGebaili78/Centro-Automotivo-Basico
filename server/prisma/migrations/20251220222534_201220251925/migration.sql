-- CreateTable
CREATE TABLE "pagamento_cliente" (
    "id_pagamento_cliente" SERIAL NOT NULL,
    "id_os" INTEGER NOT NULL,
    "metodo_pagamento" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_pagamento" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bandeira_cartao" VARCHAR(50),
    "codigo_transacao" VARCHAR(100),
    "qtd_parcelas" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pagamento_cliente_pkey" PRIMARY KEY ("id_pagamento_cliente")
);

-- AddForeignKey
ALTER TABLE "pagamento_cliente" ADD CONSTRAINT "pagamento_cliente_id_os_fkey" FOREIGN KEY ("id_os") REFERENCES "ordem_de_servico"("id_os") ON DELETE RESTRICT ON UPDATE CASCADE;
