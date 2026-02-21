-- AlterTable
ALTER TABLE "WhatsAppConversation" ADD COLUMN "labels" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "WhatsAppConversation" ADD COLUMN "customerId" TEXT;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
