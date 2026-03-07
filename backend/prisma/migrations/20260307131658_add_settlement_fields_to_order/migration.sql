-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isSettled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "settledAt" TIMESTAMP(3);
