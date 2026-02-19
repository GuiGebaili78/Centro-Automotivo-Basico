-- DropIndex
DROP INDEX "categoria_financeira_nome_key";

-- AlterTable
ALTER TABLE "categoria_financeira" ADD COLUMN     "parentId" INTEGER;

-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "id_categoria" INTEGER;

-- AlterTable
ALTER TABLE "livro_caixa" ADD COLUMN     "id_categoria" INTEGER;

-- CreateTable
CREATE TABLE "configuracao" (
    "id" TEXT NOT NULL,
    "nomeFantasia" VARCHAR(100) NOT NULL,
    "razaoSocial" VARCHAR(100),
    "cnpj" VARCHAR(18),
    "endereco" VARCHAR(255),
    "telefone" VARCHAR(20),
    "email" VARCHAR(100),
    "logoUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_financeira_nome_parentId_key" ON "categoria_financeira"("nome", "parentId");

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_financeira"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livro_caixa" ADD CONSTRAINT "livro_caixa_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_financeira"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria_financeira" ADD CONSTRAINT "categoria_financeira_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categoria_financeira"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;
