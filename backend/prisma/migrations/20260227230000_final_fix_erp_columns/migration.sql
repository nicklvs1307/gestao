-- MIGRACAO DE FORCA BRUTA PADRONIZADA (ERP SAIPOS STYLE)
-- Este script garante a criação física de todas as colunas que estão faltando.

-- 1. Tabela Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "showInMenu" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFlavor" BOOLEAN NOT NULL DEFAULT false;

-- 2. Tabela AddonGroup
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "minQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "maxQuantity" INTEGER NOT NULL DEFAULT 1;

-- 3. Tabela Addon
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "maxQuantity" INTEGER NOT NULL DEFAULT 1;

-- 4. Tabela de Junção (M:N) - Essencial para o novo sistema de categorias
CREATE TABLE IF NOT EXISTS "_CategoryToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Índices e Constraints de Chave Estrangeira (Garantia de Integridade)
CREATE UNIQUE INDEX IF NOT EXISTS "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");
CREATE INDEX IF NOT EXISTS "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_A_fkey') THEN
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_B_fkey') THEN
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
