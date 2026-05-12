/*
  Warnings:

  - You are about to drop the column `agencia` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `bairro` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `banco` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `categoria_produto` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `cep` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `chave_pix` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `cidade` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `complemento` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `condicoes_pagamento` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `conta` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `contato` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `logradouro` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `numero` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `telefone` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `uf` on the `pessoa` table. All the data in the column will be lost.
  - You are about to drop the column `whatsapp` on the `pessoa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pessoa" DROP COLUMN "agencia",
DROP COLUMN "bairro",
DROP COLUMN "banco",
DROP COLUMN "categoria_produto",
DROP COLUMN "cep",
DROP COLUMN "chave_pix",
DROP COLUMN "cidade",
DROP COLUMN "complemento",
DROP COLUMN "condicoes_pagamento",
DROP COLUMN "conta",
DROP COLUMN "contato",
DROP COLUMN "email",
DROP COLUMN "logradouro",
DROP COLUMN "numero",
DROP COLUMN "telefone",
DROP COLUMN "uf",
DROP COLUMN "whatsapp";

-- CreateTable
CREATE TABLE "fornecedor" (
    "id_fornecedor" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "documento" TEXT,
    "inscricao_estadual" TEXT,
    "inscricao_municipal" TEXT,
    "tipo_pessoa" TEXT NOT NULL DEFAULT 'JURIDICA',
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "contato" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "chave_pix" TEXT,
    "categoria_produto" TEXT,
    "condicoes_pagamento" TEXT,
    "obs" TEXT,
    "dt_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id_fornecedor")
);
