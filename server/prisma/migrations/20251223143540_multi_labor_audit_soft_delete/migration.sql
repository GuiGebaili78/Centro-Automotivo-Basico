-- DropForeignKey
ALTER TABLE "ordem_de_servico" DROP CONSTRAINT "ordem_de_servico_id_funcionario_fkey";

-- AlterTable
ALTER TABLE "fechamento_financeiro" ADD COLUMN     "deleted_at" TIMESTAMP;

-- AlterTable
ALTER TABLE "ordem_de_servico" ADD COLUMN     "deleted_at" TIMESTAMP,
ALTER COLUMN "id_funcionario" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pagamento_cliente" ADD COLUMN     "deleted_at" TIMESTAMP;

-- AlterTable
ALTER TABLE "pagamento_peca" ADD COLUMN     "deleted_at" TIMESTAMP;

-- CreateTable
CREATE TABLE "servico_mao_de_obra" (
    "id_servico_mao_de_obra" SERIAL NOT NULL,
    "id_os" INTEGER NOT NULL,
    "id_funcionario" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" VARCHAR(255),
    "dt_cadastro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "servico_mao_de_obra_pkey" PRIMARY KEY ("id_servico_mao_de_obra")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id_log" SERIAL NOT NULL,
    "tabela" VARCHAR(50) NOT NULL,
    "registro_id" INTEGER NOT NULL,
    "acao" VARCHAR(50) NOT NULL,
    "valor_antigo" TEXT,
    "valor_novo" TEXT,
    "usuario_id" INTEGER,
    "dt_criacao" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id_log")
);

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servico_mao_de_obra" ADD CONSTRAINT "servico_mao_de_obra_id_os_fkey" FOREIGN KEY ("id_os") REFERENCES "ordem_de_servico"("id_os") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servico_mao_de_obra" ADD CONSTRAINT "servico_mao_de_obra_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE RESTRICT ON UPDATE CASCADE;
