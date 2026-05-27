-- Migration: Add uairangoUserCode field for OAuth authorization
-- Created: 2026-05-27
-- Description: Adds uairangoUserCode field to store the user code returned during OAuth flow
--              Also adds uairangoAuthCodeVerifier field explicitly for PKCE flow

-- Add uairangoUserCode to IntegrationSettings (stores the user code returned from authorization)
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoUserCode" TEXT;

-- Add uairangoAuthCodeVerifier explicitly for PKCE flow
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoAuthCodeVerifier" TEXT;
