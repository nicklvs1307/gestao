-- AlterTable
ALTER TABLE "Order" ADD COLUMN "ifoodOrderId" TEXT;

-- AlterTable
ALTER TABLE "IntegrationSettings" ADD COLUMN "ifoodAccessToken" TEXT,
ADD COLUMN "ifoodClientId" TEXT,
ADD COLUMN "ifoodClientSecret" TEXT,
ADD COLUMN "ifoodEnv" TEXT NOT NULL DEFAULT 'homologation',
ADD COLUMN "ifoodIntegrationActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ifoodRestaurantId" TEXT,
ADD COLUMN "ifoodWebhookSigningKey" TEXT;