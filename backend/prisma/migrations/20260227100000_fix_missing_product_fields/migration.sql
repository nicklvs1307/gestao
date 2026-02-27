-- AlterTable
ALTER TABLE "Product" ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "isFlavor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AddonGroup" ADD COLUMN "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;
