-- Migration: Create FichaTecnica tables
-- Created: 2026-06-06
-- Description: Creates FichaTecnica and FichaTecnicaIngredient tables,
--              adds fichaTecnicaId columns to Product and Addon tables,
--              and establishes foreign key relationships.

-- Step 1: Create FichaTecnica table
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

-- Step 2: Create FichaTecnicaIngredient table
CREATE TABLE "FichaTecnicaIngredient" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "fichaTecnicaId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,

    CONSTRAINT "FichaTecnicaIngredient_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes for FichaTecnica
CREATE INDEX "FichaTecnica_restaurantId_idx" ON "FichaTecnica"("restaurantId");

-- Step 4: Create indexes for FichaTecnicaIngredient
CREATE INDEX "FichaTecnicaIngredient_fichaTecnicaId_idx" ON "FichaTecnicaIngredient"("fichaTecnicaId");
CREATE INDEX "FichaTecnicaIngredient_ingredientId_idx" ON "FichaTecnicaIngredient"("ingredientId");
CREATE UNIQUE INDEX "FichaTecnicaIngredient_fichaTecnicaId_ingredientId_key" ON "FichaTecnicaIngredient"("fichaTecnicaId", "ingredientId");

-- Step 5: Add fichaTecnicaId column to Product table
ALTER TABLE "Product" ADD COLUMN "fichaTecnicaId" TEXT;

-- Step 6: Add fichaTecnicaId column to Addon table
ALTER TABLE "Addon" ADD COLUMN "fichaTecnicaId" TEXT;

-- Step 7: Add foreign key constraints
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FichaTecnicaIngredient" ADD CONSTRAINT "FichaTecnicaIngredient_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FichaTecnicaIngredient" ADD CONSTRAINT "FichaTecnicaIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Addon" ADD CONSTRAINT "Addon_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
