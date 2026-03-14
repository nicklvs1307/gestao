-- DropForeignKey
ALTER TABLE "public"."ChecklistResponse" DROP CONSTRAINT "ChecklistResponse_taskId_fkey";

-- AlterTable
ALTER TABLE "ChecklistTask" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "ChecklistResponse" ADD CONSTRAINT "ChecklistResponse_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ChecklistTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
