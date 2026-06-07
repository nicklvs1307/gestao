-- AlterTable: IntegrationSettings - Adicionar campos Asaas
ALTER TABLE "IntegrationSettings" ADD COLUMN "asaasApiKey" TEXT;
ALTER TABLE "IntegrationSettings" ADD COLUMN "asaasEnvironment" TEXT NOT NULL DEFAULT 'sandbox';
ALTER TABLE "IntegrationSettings" ADD COLUMN "asaasActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IntegrationSettings" ADD COLUMN "asaasWebhookToken" TEXT;
ALTER TABLE "IntegrationSettings" ADD COLUMN "asaasPixEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Payment - Adicionar campos Asaas
ALTER TABLE "Payment" ADD COLUMN "asaasPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "asaasStatus" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "qrCodeBase64" TEXT;
ALTER TABLE "Payment" ADD COLUMN "pixPayload" TEXT;
ALTER TABLE "Payment" ADD COLUMN "qrCodeExpiresAt" TIMESTAMP(3);

-- CreateIndex: Payment.asaasPaymentId
CREATE INDEX "Payment_asaasPaymentId_idx" ON "Payment"("asaasPaymentId");
