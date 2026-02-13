-- Fix for ChecklistExecution userId constraint
ALTER TABLE "ChecklistExecution" ALTER COLUMN "userId" DROP NOT NULL;
