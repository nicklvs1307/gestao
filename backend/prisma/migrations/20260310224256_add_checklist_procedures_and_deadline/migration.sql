-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "deadlineTime" TEXT;

-- AlterTable
ALTER TABLE "ChecklistTask" ADD COLUMN     "procedureContent" TEXT,
ADD COLUMN     "procedureType" TEXT DEFAULT 'NONE';
