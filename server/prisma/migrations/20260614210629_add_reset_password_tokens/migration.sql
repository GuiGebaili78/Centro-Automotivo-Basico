-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "reset_password_expires" TIMESTAMP(3),
ADD COLUMN "reset_password_token" VARCHAR(255);
