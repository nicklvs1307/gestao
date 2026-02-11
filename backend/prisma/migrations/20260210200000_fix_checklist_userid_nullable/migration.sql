-- AlterTable: Make userId optional in ChecklistExecution
ALTER TABLE "ChecklistExecution" ALTER COLUMN "userId" DROP NOT NULL;
