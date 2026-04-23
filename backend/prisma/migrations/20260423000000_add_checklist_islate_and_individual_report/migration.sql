-- Migration: Add isLate field to ChecklistExecution and individual report settings
-- Created: 2026-04-23

-- 1. Add isLate field to ChecklistExecution to track delayed submissions
ALTER TABLE "ChecklistExecution" ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;

-- 2. Add individual report settings fields to ChecklistReportSettings
ALTER TABLE "ChecklistReportSettings" ADD COLUMN "sendIndividualReport" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ChecklistReportSettings" ADD COLUMN "individualReportFormat" TEXT NOT NULL DEFAULT 'TEXT';

-- 3. Add index for isLate filtering
CREATE INDEX IF NOT EXISTS "ChecklistExecution_isLate_idx" ON "ChecklistExecution" ("isLate");

-- 4. Add index for deadline checking (completedAt with checklist reference)
CREATE INDEX IF NOT EXISTS "ChecklistExecution_completedAt_isLate_idx" ON "ChecklistExecution" ("completedAt", "isLate");