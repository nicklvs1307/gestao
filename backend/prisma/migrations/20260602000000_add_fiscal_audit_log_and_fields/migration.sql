-- AlterTable: Invoice
ALTER TABLE "Invoice" ADD COLUMN "attemptLog" JSONB;
ALTER TABLE "Invoice" ADD COLUMN "ccorrectionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "lastCorrection" TEXT;

-- CreateTable: FiscalAuditLog
CREATE TABLE "FiscalAuditLog" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "requestXml" TEXT,
    "responseXml" TEXT,
    "statusCode" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalAuditLog_restaurantId_idx" ON "FiscalAuditLog"("restaurantId");
CREATE INDEX "FiscalAuditLog_action_idx" ON "FiscalAuditLog"("action");
