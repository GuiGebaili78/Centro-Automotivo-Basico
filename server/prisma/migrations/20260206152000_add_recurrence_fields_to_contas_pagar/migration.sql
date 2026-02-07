-- AlterTable
ALTER TABLE "contas_pagar" 
ADD COLUMN "id_grupo_recorrencia" VARCHAR(50),
ADD COLUMN "numero_parcela" INTEGER,
ADD COLUMN "total_parcelas" INTEGER;
