-- AlterTable
ALTER TABLE "IntegrationSettings" ADD COLUMN     "saiposToken" TEXT,
ADD COLUMN     "saiposTokenExpiresAt" TIMESTAMP(3);
