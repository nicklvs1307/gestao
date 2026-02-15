-- AlterTable
ALTER TABLE "Ingredient" DROP COLUMN "group",
ADD COLUMN     "averageCost" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "controlCmv" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "controlStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "financialCategoryId" TEXT,
ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "IngredientRecipe" ADD COLUMN     "yieldAmount" DOUBLE PRECISION DEFAULT 1;

-- CreateTable
CREATE TABLE "IngredientGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientSupplier" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "purchaseUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngredientGroup_restaurantId_idx" ON "IngredientGroup"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientGroup_name_restaurantId_parentId_key" ON "IngredientGroup"("name", "restaurantId", "parentId");

-- CreateIndex
CREATE INDEX "IngredientSupplier_ingredientId_idx" ON "IngredientSupplier"("ingredientId");

-- CreateIndex
CREATE INDEX "IngredientSupplier_supplierId_idx" ON "IngredientSupplier"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientSupplier_ingredientId_supplierId_key" ON "IngredientSupplier"("ingredientId", "supplierId");

-- CreateIndex
CREATE INDEX "Ingredient_groupId_idx" ON "Ingredient"("groupId");

-- AddForeignKey
ALTER TABLE "IngredientGroup" ADD CONSTRAINT "IngredientGroup_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientGroup" ADD CONSTRAINT "IngredientGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IngredientGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "IngredientGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_financialCategoryId_fkey" FOREIGN KEY ("financialCategoryId") REFERENCES "TransactionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientSupplier" ADD CONSTRAINT "IngredientSupplier_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientSupplier" ADD CONSTRAINT "IngredientSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
