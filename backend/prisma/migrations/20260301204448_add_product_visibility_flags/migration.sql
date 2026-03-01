-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allowDelivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowOnline" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowPos" BOOLEAN NOT NULL DEFAULT true;
