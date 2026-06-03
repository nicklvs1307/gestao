-- AlterTable: Adicionar campos de cupom de desconto na tabela Order
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "promotionId" TEXT;

-- CreateIndex: Índice para promotionId na tabela Order
CREATE INDEX "Order_promotionId_idx" ON "Order"("promotionId");

-- AddForeignKey: Relacionar Order com Promotion
ALTER TABLE "Order" ADD CONSTRAINT "Order_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
