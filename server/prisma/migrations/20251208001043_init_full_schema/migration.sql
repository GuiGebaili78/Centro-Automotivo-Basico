-- CreateTable
CREATE TABLE "pessoa" (
    "id_pessoa" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "genero" VARCHAR(20),
    "dt_nascimento" DATE,
    "obs" VARCHAR(500),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pessoa_pkey" PRIMARY KEY ("id_pessoa")
);

-- CreateTable
CREATE TABLE "pessoa_fisica" (
    "id_pessoa_fisica" SERIAL NOT NULL,
    "id_pessoa" INTEGER NOT NULL,
    "cpf" VARCHAR(11),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pessoa_fisica_pkey" PRIMARY KEY ("id_pessoa_fisica")
);

-- CreateTable
CREATE TABLE "pessoa_juridica" (
    "id_pessoa_juridica" SERIAL NOT NULL,
    "id_pessoa" INTEGER NOT NULL,
    "razao_social" VARCHAR(100) NOT NULL,
    "nome_fantasia" VARCHAR(100),
    "cnpj" VARCHAR(14),
    "inscricao_estadual" VARCHAR(50),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pessoa_juridica_pkey" PRIMARY KEY ("id_pessoa_juridica")
);

-- CreateTable
CREATE TABLE "tipo" (
    "id_tipo" SERIAL NOT NULL,
    "funcao" VARCHAR(50),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_pkey" PRIMARY KEY ("id_tipo")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id_cliente" SERIAL NOT NULL,
    "id_pessoa_fisica" INTEGER,
    "id_pessoa_juridica" INTEGER,
    "tipo_pessoa" INTEGER NOT NULL,
    "telefone_1" VARCHAR(15) NOT NULL,
    "telefone_2" VARCHAR(15),
    "telefone_3" VARCHAR(15),
    "email" VARCHAR(100),
    "logradouro" VARCHAR(150) NOT NULL,
    "nr_logradouro" VARCHAR(10) NOT NULL,
    "compl_logradouro" VARCHAR(50),
    "bairro" VARCHAR(100) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "funcionario" (
    "id_funcionario" SERIAL NOT NULL,
    "id_pessoa_fisica" INTEGER NOT NULL,
    "ativo" CHAR(1) NOT NULL,
    "cargo" VARCHAR(50) NOT NULL,
    "salario" DECIMAL(10,2),
    "comissao" INTEGER,
    "dt_admissao" TIMESTAMP NOT NULL,
    "dt_recisao" TIMESTAMP,
    "motivo_saida" VARCHAR(200),
    "obs" VARCHAR(500),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funcionario_pkey" PRIMARY KEY ("id_funcionario")
);

-- CreateTable
CREATE TABLE "pecas_estoque" (
    "id_pecas_estoque" SERIAL NOT NULL,
    "fabricante" VARCHAR(50),
    "nome" VARCHAR(255) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor_custo" DECIMAL(10,2) NOT NULL,
    "valor_venda" DECIMAL(10,2) NOT NULL,
    "estoque_atual" INTEGER NOT NULL,
    "unidade_medida" VARCHAR(20),
    "dt_ultima_compra" TIMESTAMP,
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pecas_estoque_pkey" PRIMARY KEY ("id_pecas_estoque")
);

-- CreateTable
CREATE TABLE "veiculo" (
    "id_veiculo" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "placa" VARCHAR(8) NOT NULL,
    "chassi" VARCHAR(20),
    "marca" VARCHAR(50) NOT NULL,
    "modelo" VARCHAR(50) NOT NULL,
    "versao" VARCHAR(50),
    "ano_modelo" VARCHAR(10) NOT NULL,
    "cor" VARCHAR(30) NOT NULL,
    "combustivel" VARCHAR(20) NOT NULL,
    "obs" VARCHAR(500),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculo_pkey" PRIMARY KEY ("id_veiculo")
);

-- CreateTable
CREATE TABLE "ordem_de_servico" (
    "id_os" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_veiculo" INTEGER NOT NULL,
    "id_funcionario" INTEGER NOT NULL,
    "dt_abertura" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_entrega" TIMESTAMP,
    "km_entrada" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "defeito_relatado" VARCHAR(500),
    "diagnostico" VARCHAR(500),
    "valor_servico" DECIMAL(10,2),
    "valor_pecas" DECIMAL(10,2),
    "valor_final" DECIMAL(12,2),
    "modo_pagamento" VARCHAR(50),
    "cod_pagamento" VARCHAR(80),
    "parcelas" INTEGER NOT NULL,
    "obs" VARCHAR(500),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_de_servico_pkey" PRIMARY KEY ("id_os")
);

-- CreateTable
CREATE TABLE "itens_os" (
    "id_iten" SERIAL NOT NULL,
    "id_os" INTEGER NOT NULL,
    "id_pecas_estoque" INTEGER,
    "descricao" VARCHAR(500) NOT NULL,
    "qtd" INTEGER NOT NULL,
    "valor_unt" DECIMAL(10,2) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_os_pkey" PRIMARY KEY ("id_iten")
);

-- CreateTable
CREATE TABLE "finalizacao" (
    "id_finalizacao" SERIAL NOT NULL,
    "id_os" INTEGER NOT NULL,
    "valor_peca_entrada" DECIMAL(10,2),
    "valor_peca_saida" DECIMAL(10,2),
    "valor_pago_funcionario" DECIMAL(10,2),
    "obs" VARCHAR(500),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finalizacao_pkey" PRIMARY KEY ("id_finalizacao")
);

-- CreateIndex
CREATE UNIQUE INDEX "pessoa_fisica_id_pessoa_key" ON "pessoa_fisica"("id_pessoa");

-- CreateIndex
CREATE UNIQUE INDEX "pessoa_fisica_cpf_key" ON "pessoa_fisica"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "pessoa_juridica_id_pessoa_key" ON "pessoa_juridica"("id_pessoa");

-- CreateIndex
CREATE UNIQUE INDEX "pessoa_juridica_cnpj_key" ON "pessoa_juridica"("cnpj");

-- CreateIndex
CREATE INDEX "cliente_id_pessoa_fisica_idx" ON "cliente"("id_pessoa_fisica");

-- CreateIndex
CREATE INDEX "cliente_id_pessoa_juridica_idx" ON "cliente"("id_pessoa_juridica");

-- CreateIndex
CREATE INDEX "cliente_tipo_pessoa_idx" ON "cliente"("tipo_pessoa");

-- CreateIndex
CREATE UNIQUE INDEX "funcionario_id_pessoa_fisica_key" ON "funcionario"("id_pessoa_fisica");

-- CreateIndex
CREATE UNIQUE INDEX "veiculo_placa_key" ON "veiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "finalizacao_id_os_key" ON "finalizacao"("id_os");

-- AddForeignKey
ALTER TABLE "pessoa_fisica" ADD CONSTRAINT "pessoa_fisica_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "pessoa"("id_pessoa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pessoa_juridica" ADD CONSTRAINT "pessoa_juridica_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "pessoa"("id_pessoa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_pessoa_fisica_fkey" FOREIGN KEY ("id_pessoa_fisica") REFERENCES "pessoa_fisica"("id_pessoa_fisica") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_id_pessoa_juridica_fkey" FOREIGN KEY ("id_pessoa_juridica") REFERENCES "pessoa_juridica"("id_pessoa_juridica") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_tipo_pessoa_fkey" FOREIGN KEY ("tipo_pessoa") REFERENCES "tipo"("id_tipo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionario" ADD CONSTRAINT "funcionario_id_pessoa_fisica_fkey" FOREIGN KEY ("id_pessoa_fisica") REFERENCES "pessoa_fisica"("id_pessoa_fisica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_id_veiculo_fkey" FOREIGN KEY ("id_veiculo") REFERENCES "veiculo"("id_veiculo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_os" ADD CONSTRAINT "itens_os_id_os_fkey" FOREIGN KEY ("id_os") REFERENCES "ordem_de_servico"("id_os") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_os" ADD CONSTRAINT "itens_os_id_pecas_estoque_fkey" FOREIGN KEY ("id_pecas_estoque") REFERENCES "pecas_estoque"("id_pecas_estoque") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finalizacao" ADD CONSTRAINT "finalizacao_id_os_fkey" FOREIGN KEY ("id_os") REFERENCES "ordem_de_servico"("id_os") ON DELETE RESTRICT ON UPDATE CASCADE;
