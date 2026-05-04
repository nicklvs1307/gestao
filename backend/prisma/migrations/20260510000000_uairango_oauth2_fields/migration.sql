-- Migration: Add UaiRango OAuth 2.0 fields
-- Created: 2026-05-04
-- Description: Adds OAuth 2.0 fields for UaiRango Connect API integration

-- Add UaiRango OAuth 2.0 columns to IntegrationSettings table
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoClientId" VARCHAR(255);
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoClientSecret" VARCHAR(500);
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoAccessToken" TEXT;
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoRefreshToken" TEXT;

-- Create indexes for faster lookups
CREATE INDEX "IntegrationSettings_uairangoClientId_idx" ON "IntegrationSettings"("uairangoClientId") WHERE "uairangoClientId" IS NOT NULL;