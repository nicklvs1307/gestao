-- Migration: Add 99Food integration fields
-- Created: 2026-05-08
-- Description: Adds 99Food/DiDi Food fields to IntegrationSettings and Order

-- Add 99Food columns to IntegrationSettings
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99MerchantId" VARCHAR(255);
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99IntegrationActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99Env" VARCHAR(50) NOT NULL DEFAULT 'production';
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99AppShopId" VARCHAR(255);

-- Add 99Food order ID to Order table
ALTER TABLE "Order" ADD COLUMN "food99OrderId" VARCHAR(255);

-- Indexes
CREATE INDEX "IntegrationSettings_food99MerchantId_idx" ON "IntegrationSettings"("food99MerchantId") WHERE "food99MerchantId" IS NOT NULL;
CREATE INDEX "Order_food99OrderId_idx" ON "Order"("food99OrderId") WHERE "food99OrderId" IS NOT NULL;
