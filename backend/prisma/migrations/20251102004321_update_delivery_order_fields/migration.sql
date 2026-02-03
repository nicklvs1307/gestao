/*
  Warnings:

  - You are about to drop the column `customerName` on the `DeliveryOrder` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `DeliveryOrder` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryAddress` on the `DeliveryOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DeliveryOrder" DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
DROP COLUMN "deliveryAddress",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "changeFor" DOUBLE PRECISION,
ADD COLUMN     "deliveryType" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "phone" TEXT;
