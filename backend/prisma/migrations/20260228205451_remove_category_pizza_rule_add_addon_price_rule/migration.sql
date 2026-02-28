/*
  Warnings:

  - You are about to drop the column `halfAndHalfRule` on the `Category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AddonGroup" ADD COLUMN     "priceRule" TEXT DEFAULT 'higher';

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "halfAndHalfRule";
