-- AlterTable
ALTER TABLE "Addon" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "promoEndDate" TIMESTAMP(3),
ADD COLUMN     "promoPrice" DOUBLE PRECISION,
ADD COLUMN     "promoStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "globalSizeId" TEXT,
ALTER COLUMN "price" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_globalSizeId_idx" ON "Product"("globalSizeId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_globalSizeId_fkey" FOREIGN KEY ("globalSizeId") REFERENCES "GlobalSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;
