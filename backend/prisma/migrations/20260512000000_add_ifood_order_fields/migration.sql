-- Add iFood order fields for homologation
-- DisplayId (code de coleta), Schedule (agendamento), Benefits (cupons), Customer document, Cancellation/Dispute handling

-- Add displayId (código de coleta)
ALTER TABLE "Order" ADD COLUMN "displayId" TEXT;

-- Add scheduledDateTime (agendamento)
ALTER TABLE "Order" ADD COLUMN "scheduledDateTime" TIMESTAMP;

-- Add customerDocument (CPF/CNPJ)
ALTER TABLE "Order" ADD COLUMN "customerDocument" TEXT;

-- Add benefits (cupons/benefícios)
ALTER TABLE "Order" ADD COLUMN "benefits" JSONB;

-- Add cancellation fields
ALTER TABLE "Order" ADD COLUMN "cancellationRequested" BOOLEAN DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "cancellationDeadline" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN "cancellationSource" TEXT;

-- Add dispute fields (Handshake - pós-entrega)
ALTER TABLE "Order" ADD COLUMN "disputeId" TEXT;
ALTER TABLE "Order" ADD COLUMN "disputeExpiresAt" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN "disputeReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "disputeEvidence" JSONB;