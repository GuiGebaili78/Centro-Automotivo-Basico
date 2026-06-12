ALTER TABLE "item_entrada" ALTER COLUMN "ref_cod" TYPE TEXT;
ALTER TABLE "item_entrada" ALTER COLUMN "aplicacao" TYPE TEXT;
ALTER TABLE "item_entrada" ALTER COLUMN "obs" TYPE TEXT;
ALTER TABLE "item_entrada" ALTER COLUMN "condicao" TYPE VARCHAR(100);

ALTER TABLE "pecas_estoque" ALTER COLUMN "ref_cod" TYPE TEXT;
ALTER TABLE "pecas_estoque" ALTER COLUMN "aplicacao" TYPE TEXT;
ALTER TABLE "pecas_estoque" ALTER COLUMN "localizacao" TYPE VARCHAR(255);
