-- SQL PARA ESTABILIZACAO DEFINITIVA DO BANCO DE DADOS
-- Este script garante que todas as colunas e tabelas do novo ERP Saipos existam
-- Rode este script DIRETAMENTE no seu banco PostgreSQL (pgAdmin ou psql)

DO $$ 
BEGIN 
    RAISE NOTICE 'Iniciando verificacao de integridade ERP Saipos...';

    -- 1. Tabelas de Junção Implicitas do Prisma (ManyToMany)
    -- Se estas tabelas nao existirem, o Prisma falha ao buscar produtos com categorias/adicionais
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_AddonGroupToProduct') THEN
        CREATE TABLE "_AddonGroupToProduct" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_AddonGroupToProduct_AB_unique" ON "_AddonGroupToProduct"("A", "B");
        CREATE INDEX "_AddonGroupToProduct_B_index" ON "_AddonGroupToProduct"("B");
        ALTER TABLE "_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_CategoryToProduct') THEN
        CREATE TABLE "_CategoryToProduct" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");
        CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_AddonGroupToCategory') THEN
        CREATE TABLE "_AddonGroupToCategory" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_AddonGroupToCategory_AB_unique" ON "_AddonGroupToCategory"("A", "B");
        CREATE INDEX "_AddonGroupToCategory_B_index" ON "_AddonGroupToCategory"("B");
        ALTER TABLE "_AddonGroupToCategory" ADD CONSTRAINT "_AddonGroupToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_AddonGroupToCategory" ADD CONSTRAINT "_AddonGroupToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_PermissionToRole') THEN
        CREATE TABLE "_PermissionToRole" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");
        CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");
        ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_UserPermissions') THEN
        CREATE TABLE "_UserPermissions" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_UserPermissions_AB_unique" ON "_UserPermissions"("A", "B");
        CREATE INDEX "_UserPermissions_B_index" ON "_UserPermissions"("B");
        ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- 2. Colunas Faltantes em Tabelas Existentes
    
    -- Tabela Addon
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Addon' AND column_name = 'description') THEN ALTER TABLE "Addon" ADD COLUMN "description" TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Addon' AND column_name = 'imageUrl') THEN ALTER TABLE "Addon" ADD COLUMN "imageUrl" TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Addon' AND column_name = 'maxQuantity') THEN ALTER TABLE "Addon" ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 1; END IF;

    -- Tabela AddonGroup
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AddonGroup' AND column_name = 'isFlavorGroup') THEN ALTER TABLE "AddonGroup" ADD COLUMN "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AddonGroup' AND column_name = 'minQuantity') THEN ALTER TABLE "AddonGroup" ADD COLUMN "minQuantity" INTEGER NOT NULL DEFAULT 0; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AddonGroup' AND column_name = 'maxQuantity') THEN ALTER TABLE "AddonGroup" ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 1; END IF;

    -- Tabela Product
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'showInMenu') THEN ALTER TABLE "Product" ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT true; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'isFlavor') THEN ALTER TABLE "Product" ADD COLUMN "isFlavor" BOOLEAN NOT NULL DEFAULT false; END IF;

    -- 3. Colunas de Integracao (saiposIntegrationCode)
    FOR tbl IN SELECT unnest(ARRAY['Addon', 'AddonGroup', 'Product', 'Size', 'Category', 'Promotion', 'PaymentMethod']) LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'saiposIntegrationCode') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN "saiposIntegrationCode" TEXT', tbl);
        END IF;
    END LOOP;

    -- 4. LIMPEZA DO HISTORICO DE MIGRACAO PRISMA
    -- Remove as migracoes de "reparo" que falharam ou causaram drift na VPS
    DELETE FROM "_prisma_migrations" WHERE migration_name LIKE '%emergency%';
    DELETE FROM "_prisma_migrations" WHERE migration_name LIKE '%final_fix_erp_columns%';
    DELETE FROM "_prisma_migrations" WHERE migration_name LIKE '%smart_erp_sync%';
    DELETE FROM "_prisma_migrations" WHERE migration_name LIKE '%add_junction_tables%';

    RAISE NOTICE 'Script de estabilizacao concluido com sucesso.';
END $$;
