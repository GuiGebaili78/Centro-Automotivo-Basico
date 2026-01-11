-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "credor" VARCHAR(100),
ADD COLUMN     "dt_emissao" DATE,
ADD COLUMN     "forma_pagamento" VARCHAR(50),
ADD COLUMN     "num_documento" VARCHAR(50),
ADD COLUMN     "url_anexo" VARCHAR(500);

-- AlterTable
ALTER TABLE "fornecedor" ADD COLUMN     "agencia" VARCHAR(20),
ADD COLUMN     "bairro" VARCHAR(100),
ADD COLUMN     "banco" VARCHAR(50),
ADD COLUMN     "categoria_produto" VARCHAR(100),
ADD COLUMN     "cep" VARCHAR(10),
ADD COLUMN     "chave_pix" VARCHAR(100),
ADD COLUMN     "cidade" VARCHAR(100),
ADD COLUMN     "complemento" VARCHAR(100),
ADD COLUMN     "condicoes_pagamento" VARCHAR(100),
ADD COLUMN     "conta" VARCHAR(20),
ADD COLUMN     "email" VARCHAR(100),
ADD COLUMN     "inscricao_estadual" VARCHAR(50),
ADD COLUMN     "inscricao_municipal" VARCHAR(50),
ADD COLUMN     "logradouro" VARCHAR(150),
ADD COLUMN     "nome_fantasia" VARCHAR(100),
ADD COLUMN     "numero" VARCHAR(20),
ADD COLUMN     "obs" VARCHAR(500),
ADD COLUMN     "telefone" VARCHAR(20),
ADD COLUMN     "tipo_pessoa" VARCHAR(20) DEFAULT 'JURIDICA',
ADD COLUMN     "uf" CHAR(2),
ADD COLUMN     "whatsapp" VARCHAR(20);

-- AlterTable
ALTER TABLE "funcionario" ADD COLUMN     "agencia" VARCHAR(20),
ADD COLUMN     "bairro" VARCHAR(100),
ADD COLUMN     "banco" VARCHAR(50),
ADD COLUMN     "cep" VARCHAR(10),
ADD COLUMN     "chave_pix" VARCHAR(100),
ADD COLUMN     "cidade" VARCHAR(100),
ADD COLUMN     "cnpj_mei" VARCHAR(20),
ADD COLUMN     "comissao_pecas" DECIMAL(5,2),
ADD COLUMN     "complemento" VARCHAR(100),
ADD COLUMN     "conta" VARCHAR(20),
ADD COLUMN     "dia_vencimento" INTEGER,
ADD COLUMN     "email_pessoal" VARCHAR(100),
ADD COLUMN     "equipamentos_epis" TEXT,
ADD COLUMN     "especialidade" VARCHAR(100),
ADD COLUMN     "inscricao_municipal" VARCHAR(50),
ADD COLUMN     "logradouro" VARCHAR(150),
ADD COLUMN     "nome_fantasia" VARCHAR(100),
ADD COLUMN     "numero" VARCHAR(20),
ADD COLUMN     "periodicidade_pagamento" VARCHAR(50),
ADD COLUMN     "razao_social" VARCHAR(100),
ADD COLUMN     "rg" VARCHAR(20),
ADD COLUMN     "telefone_pessoal" VARCHAR(20),
ADD COLUMN     "tipo_pagamento" VARCHAR(50),
ADD COLUMN     "uf" CHAR(2),
ADD COLUMN     "url_ccmei" VARCHAR(500),
ADD COLUMN     "url_cnh" VARCHAR(500),
ADD COLUMN     "valor_pagamento" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "livro_caixa" ADD COLUMN     "id_conta_bancaria" INTEGER;

-- CreateTable
CREATE TABLE "conta_bancaria" (
    "id_conta" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "banco" VARCHAR(50),
    "agencia" VARCHAR(20),
    "conta" VARCHAR(20),
    "saldo_atual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conta_bancaria_pkey" PRIMARY KEY ("id_conta")
);

-- CreateTable
CREATE TABLE "operadora_cartao" (
    "id_operadora" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "taxa_debito" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "prazo_debito" INTEGER NOT NULL DEFAULT 1,
    "taxa_credito_vista" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "prazo_credito_vista" INTEGER NOT NULL DEFAULT 30,
    "taxa_credito_parc" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "prazo_credito_parc" INTEGER NOT NULL DEFAULT 30,
    "taxa_antecipacao" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "antecipacao_auto" BOOLEAN NOT NULL DEFAULT false,
    "id_conta_destino" INTEGER NOT NULL,

    CONSTRAINT "operadora_cartao_pkey" PRIMARY KEY ("id_operadora")
);

-- CreateTable
CREATE TABLE "recebivel_cartao" (
    "id_recebivel" SERIAL NOT NULL,
    "id_os" INTEGER,
    "id_operadora" INTEGER NOT NULL,
    "num_parcela" INTEGER NOT NULL DEFAULT 1,
    "total_parcelas" INTEGER NOT NULL DEFAULT 1,
    "valor_bruto" DECIMAL(10,2) NOT NULL,
    "valor_liquido" DECIMAL(10,2) NOT NULL,
    "taxa_aplicada" DECIMAL(10,2) NOT NULL,
    "data_venda" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_prevista" DATE NOT NULL,
    "data_recebimento" DATE,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "recebivel_cartao_pkey" PRIMARY KEY ("id_recebivel")
);

-- AddForeignKey
ALTER TABLE "livro_caixa" ADD CONSTRAINT "livro_caixa_id_conta_bancaria_fkey" FOREIGN KEY ("id_conta_bancaria") REFERENCES "conta_bancaria"("id_conta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operadora_cartao" ADD CONSTRAINT "operadora_cartao_id_conta_destino_fkey" FOREIGN KEY ("id_conta_destino") REFERENCES "conta_bancaria"("id_conta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebivel_cartao" ADD CONSTRAINT "recebivel_cartao_id_operadora_fkey" FOREIGN KEY ("id_operadora") REFERENCES "operadora_cartao"("id_operadora") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebivel_cartao" ADD CONSTRAINT "recebivel_cartao_id_os_fkey" FOREIGN KEY ("id_os") REFERENCES "ordem_de_servico"("id_os") ON DELETE SET NULL ON UPDATE CASCADE;
