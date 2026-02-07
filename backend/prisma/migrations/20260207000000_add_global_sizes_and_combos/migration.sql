-- CreateTable
CREATE TABLE "GlobalSize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "GlobalSize_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AddonGroup" ADD COLUMN     "maxQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "minQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Size" ADD COLUMN     "globalSizeId" TEXT;

-- CreateTable
CREATE TABLE "_AddonGroupToCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSize_name_restaurantId_key" ON "GlobalSize"("name", "restaurantId");

-- CreateIndex
CREATE INDEX "GlobalSize_restaurantId_idx" ON "GlobalSize"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "_AddonGroupToCategory_AB_unique" ON "_AddonGroupToCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_AddonGroupToCategory_B_index" ON "_AddonGroupToCategory"("B");

-- AddForeignKey
ALTER TABLE "GlobalSize" ADD CONSTRAINT "GlobalSize_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Size" ADD CONSTRAINT "Size_globalSizeId_fkey" FOREIGN KEY ("globalSizeId") REFERENCES "GlobalSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AddonGroupToCategory" ADD CONSTRAINT "_AddonGroupToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AddonGroupToCategory" ADD CONSTRAINT "_AddonGroupToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
