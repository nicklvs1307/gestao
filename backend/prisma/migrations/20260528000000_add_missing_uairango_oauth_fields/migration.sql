-- Migration: Add missing UaiRango OAuth fields
-- Created: 2026-05-28
-- Description: Adds uairangoAuthStatus and uairangoAuthorizedAt fields that were missing
--              These fields are required for OAuth 2.0 authorization flow with UaiRango Connect API

-- Add uairangoAuthStatus column (stores authorization state: PENDING, AUTHORIZED, EXPIRED, REVOKED)
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoAuthStatus" VARCHAR(50) NOT NULL DEFAULT 'PENDING';

-- Add uairangoAuthorizedAt column (timestamp of successful authorization)
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoAuthorizedAt" TIMESTAMP(3);