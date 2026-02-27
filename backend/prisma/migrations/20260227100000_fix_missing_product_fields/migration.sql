-- Migration corrigida para adicionar campos de vitrine e sabores
-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "showInMenu" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFlavor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;
