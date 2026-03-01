-- AlterTable
ALTER TABLE "IntegrationSettings" ADD COLUMN     "uairangoActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uairangoEstablishmentId" TEXT,
ADD COLUMN     "uairangoImportedAt" TIMESTAMP(3),
ADD COLUMN     "uairangoToken" TEXT;
