-- AlterTable: Adicionar campo de controle de confirmação iFood
ALTER TABLE "Order" ADD COLUMN "ifoodConfirmed" BOOLEAN NOT NULL DEFAULT false;
