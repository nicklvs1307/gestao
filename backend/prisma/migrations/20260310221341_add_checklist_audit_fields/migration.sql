-- AlterTable
ALTER TABLE "ChecklistExecution" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "externalUserName" TEXT;

-- CreateIndex
CREATE INDEX "ChecklistResponse_taskId_idx" ON "ChecklistResponse"("taskId");

-- AddForeignKey
ALTER TABLE "ChecklistResponse" ADD CONSTRAINT "ChecklistResponse_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ChecklistTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
