-- CreateTable
CREATE TABLE "FiscalRetryQueue" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FiscalRetryQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalRetryQueue_orderId_idx" ON "FiscalRetryQueue"("orderId");

-- CreateIndex
CREATE INDEX "FiscalRetryQueue_status_idx" ON "FiscalRetryQueue"("status");