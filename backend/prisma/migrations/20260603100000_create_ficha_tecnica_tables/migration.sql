-- CreateTable
CREATE TABLE "FichaTecnica" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "yieldAmount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FichaTecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaTecnicaIngredient" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "fichaTecnicaId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,

    CONSTRAINT "FichaTecnicaIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FichaTecnica_restaurantId_idx" ON "FichaTecnica"("restaurantId");

-- CreateIndex
CREATE INDEX "FichaTecnicaIngredient_fichaTecnicaId_idx" ON "FichaTecnicaIngredient"("fichaTecnicaId");

-- CreateIndex
CREATE INDEX "FichaTecnicaIngredient_ingredientId_idx" ON "FichaTecnicaIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "FichaTecnicaIngredient_fichaTecnicaId_ingredientId_key" ON "FichaTecnicaIngredient"("fichaTecnicaId", "ingredientId");

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnicaIngredient" ADD CONSTRAINT "FichaTecnicaIngredient_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnicaIngredient" ADD CONSTRAINT "FichaTecnicaIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addon" ADD CONSTRAINT "Addon_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
