-- Criar tabela de junção para AddonGroups e Products
CREATE TABLE IF NOT EXISTS "_AddonGroupToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Criar índices
CREATE UNIQUE INDEX IF NOT EXISTS "_AddonGroupToProduct_AB_unique" ON "_AddonGroupToProduct"("A", "B");
CREATE INDEX IF NOT EXISTS "_AddonGroupToProduct_B_index" ON "_AddonGroupToProduct"("B");

-- Adicionar chaves estrangeiras
ALTER TABLE "_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
