-- Create ChecklistReportLog table
CREATE TABLE "ChecklistReportLog" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "checklistId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,

    CONSTRAINT "ChecklistReportLog_pkey" PRIMARY KEY ("id")
);

-- Add new columns to ChecklistReportSettings
ALTER TABLE "ChecklistReportSettings" ADD COLUMN "recipientPhones" TEXT;
ALTER TABLE "ChecklistReportSettings" ADD COLUMN "customMessage" TEXT;

-- Indexes
CREATE INDEX "ChecklistReportLog_restaurantId_idx" ON "ChecklistReportLog"("restaurantId");
CREATE INDEX "ChecklistReportLog_sentAt_idx" ON "ChecklistReportLog"("sentAt");
CREATE INDEX "ChecklistReportLog_type_idx" ON "ChecklistReportLog"("type");

-- Foreign key
ALTER TABLE "ChecklistReportLog" ADD CONSTRAINT "ChecklistReportLog_restaurantId_fkey" 
    FOREIGN KEY ("restaurantId") REFERENCES "ChecklistReportSettings"("restaurantId") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rollback
-- DROP TABLE IF EXISTS "ChecklistReportLog";
-- ALTER TABLE "ChecklistReportSettings" DROP COLUMN IF EXISTS "recipientPhones";
-- ALTER TABLE "ChecklistReportSettings" DROP COLUMN IF EXISTS "customMessage";
