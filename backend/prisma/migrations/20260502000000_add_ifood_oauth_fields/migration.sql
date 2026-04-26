-- AlterTable
ALTER TABLE "IntegrationSettings" ADD COLUMN "ifoodRefreshToken" TEXT,
ADD COLUMN "ifoodAccessTokenExpiresAt" TIMESTAMP(3);