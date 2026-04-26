-- AlterTable: Refatoração iFood - polling ao invés de webhook
-- Adicionar campo dedicado para authorizationCodeVerifier (não sobrecarrega ifoodAccessToken)
ALTER TABLE "IntegrationSettings" ADD COLUMN "ifoodAuthCodeVerifier" TEXT;

-- Remover campo de webhook signing key (não mais necessário com polling)
ALTER TABLE "IntegrationSettings" DROP COLUMN IF EXISTS "ifoodWebhookSigningKey";

-- Alterar default do ifoodEnv de "homologation" para "production"
ALTER TABLE "IntegrationSettings" ALTER COLUMN "ifoodEnv" SET DEFAULT 'production';
