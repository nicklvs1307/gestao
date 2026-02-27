-- Migration padronizada para alinhar Product e AddonGroup com o schema ERP (Saipos Style)

-- 1. Alterar Tabela Product (Adicionar campos de visibilidade e categoria legada nullable)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "showInMenu" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFlavor" BOOLEAN NOT NULL DEFAULT false;

-- 2. Alterar Tabela AddonGroup (Adicionar campos de controle de combos e sabores)
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "minQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "maxQuantity" INTEGER NOT NULL DEFAULT 1;

-- 3. Alterar Tabela Addon (Adicionar limite de quantidade por item)
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "maxQuantity" INTEGER NOT NULL DEFAULT 1;

-- 4. Garantir Tabela de Junção para Categorias (Muitos-para-Muitos)
-- Nota: O Prisma gerencia a tabela _CategoryToProduct se usada a relação implícita
CREATE TABLE IF NOT EXISTS "_CategoryToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Criar índices únicos para a tabela de junção se não existirem
CREATE UNIQUE INDEX IF NOT EXISTS "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");
CREATE INDEX IF NOT EXISTS "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- Adicionar Foreign Keys para a tabela de junção (padrão Prisma)
-- Verificando se as FKs existem antes de criar (evitar erro de redeploy local)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_A_fkey') THEN
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_B_fkey') THEN
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
