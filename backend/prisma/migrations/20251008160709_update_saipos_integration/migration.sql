/*
  Warnings:

  - You are about to drop the column `saiposToken` on the `IntegrationSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "IntegrationSettings" DROP COLUMN "saiposToken",
ADD COLUMN     "saiposPartnerId" TEXT,
ADD COLUMN     "saiposSecret" TEXT;
