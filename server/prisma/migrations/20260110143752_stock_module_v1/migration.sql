-- AlterTable
ALTER TABLE "servico_mao_de_obra" ADD COLUMN     "id_pagamento_equipe" INTEGER,
ADD COLUMN     "status_pagamento" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE';

-- CreateTable
CREATE TABLE "pagamento_equipe" (
    "id_pagamento_equipe" SERIAL NOT NULL,
    "id_funcionario" INTEGER NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "forma_pagamento" VARCHAR(50),
    "premio_valor" DECIMAL(10,2),
    "premio_descricao" VARCHAR(255),
    "dt_pagamento" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_lancamento" VARCHAR(50) NOT NULL DEFAULT 'COMISSAO',
    "referencia_inicio" DATE,
    "referencia_fim" DATE,
    "obs" VARCHAR(500),
    "descontado" BOOLEAN NOT NULL DEFAULT false,
    "id_pagamento_deducao" INTEGER,

    CONSTRAINT "pagamento_equipe_pkey" PRIMARY KEY ("id_pagamento_equipe")
);

-- CreateTable
CREATE TABLE "livro_caixa" (
    "id_livro_caixa" SERIAL NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo_movimentacao" VARCHAR(10) NOT NULL,
    "categoria" VARCHAR(50) NOT NULL,
    "dt_movimentacao" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obs" VARCHAR(500),
    "origem" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    "deleted_at" TIMESTAMP,
    "id_pagamento_equipe" INTEGER,

    CONSTRAINT "livro_caixa_pkey" PRIMARY KEY ("id_livro_caixa")
);

-- CreateTable
CREATE TABLE "categoria_financeira" (
    "id_categoria" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoria_financeira_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "entrada_estoque" (
    "id_entrada" SERIAL NOT NULL,
    "id_fornecedor" INTEGER NOT NULL,
    "nota_fiscal" VARCHAR(50),
    "data_compra" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "obs" VARCHAR(500),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrada_estoque_pkey" PRIMARY KEY ("id_entrada")
);

-- CreateTable
CREATE TABLE "item_entrada" (
    "id_item_entrada" SERIAL NOT NULL,
    "id_entrada" INTEGER NOT NULL,
    "id_pecas_estoque" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_custo" DECIMAL(10,2) NOT NULL,
    "margem_lucro" DECIMAL(10,2),
    "valor_venda" DECIMAL(10,2) NOT NULL,
    "ref_cod" VARCHAR(50),
    "obs" VARCHAR(255),

    CONSTRAINT "item_entrada_pkey" PRIMARY KEY ("id_item_entrada")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_financeira_nome_key" ON "categoria_financeira"("nome");

-- AddForeignKey
ALTER TABLE "servico_mao_de_obra" ADD CONSTRAINT "servico_mao_de_obra_id_pagamento_equipe_fkey" FOREIGN KEY ("id_pagamento_equipe") REFERENCES "pagamento_equipe"("id_pagamento_equipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_equipe" ADD CONSTRAINT "pagamento_equipe_id_pagamento_deducao_fkey" FOREIGN KEY ("id_pagamento_deducao") REFERENCES "pagamento_equipe"("id_pagamento_equipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_equipe" ADD CONSTRAINT "pagamento_equipe_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livro_caixa" ADD CONSTRAINT "livro_caixa_id_pagamento_equipe_fkey" FOREIGN KEY ("id_pagamento_equipe") REFERENCES "pagamento_equipe"("id_pagamento_equipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_estoque" ADD CONSTRAINT "entrada_estoque_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id_fornecedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_entrada" ADD CONSTRAINT "item_entrada_id_entrada_fkey" FOREIGN KEY ("id_entrada") REFERENCES "entrada_estoque"("id_entrada") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_entrada" ADD CONSTRAINT "item_entrada_id_pecas_estoque_fkey" FOREIGN KEY ("id_pecas_estoque") REFERENCES "pecas_estoque"("id_pecas_estoque") ON DELETE RESTRICT ON UPDATE CASCADE;
