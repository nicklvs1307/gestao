-- AlterTable: Remove ifoodClientId and ifoodClientSecret from IntegrationSettings
-- Credentials are now centralized as environment variables (Docker secrets)
ALTER TABLE "IntegrationSettings" DROP COLUMN IF EXISTS "ifoodClientId";
ALTER TABLE "IntegrationSettings" DROP COLUMN IF EXISTS "ifoodClientSecret";
