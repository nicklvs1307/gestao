-- Migration: Add ifoodMerchantId for centralized integration
-- Created: 2026-04-28
-- Description: Adds ifoodMerchantId field to support iFood centralized (client_credentials) authentication model

-- Add ifoodMerchantId column to IntegrationSettings table
ALTER TABLE "IntegrationSettings" ADD COLUMN "ifoodMerchantId" VARCHAR(255);

-- Create index for faster lookups by merchant ID
CREATE INDEX "IntegrationSettings_ifoodMerchantId_idx" ON "IntegrationSettings"("ifoodMerchantId") WHERE "ifoodMerchantId" IS NOT NULL;