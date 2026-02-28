-- MIGRACAO DE REPARO DE EMERGENCIA DO BANCO DE DADOS
-- Este script garante a existencia fisica das tabelas e colunas envolvidas nos erros 500

DO $$ 
BEGIN 
    RAISE NOTICE 'Iniciando reparo de emergencia do banco de dados...';

    -- 1. Tabelas de Junção Essenciais para Relações Muitos-para-Muitos do Prisma
    
    -- _AddonGroupToProduct (Provavel causa do Erro 500 em /api/products)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_AddonGroupToProduct') THEN
        CREATE TABLE "_AddonGroupToProduct" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_AddonGroupToProduct_AB_unique" ON "_AddonGroupToProduct"("A", "B");
        CREATE INDEX "_AddonGroupToProduct_B_index" ON "_AddonGroupToProduct"("B");
        ALTER TABLE "_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela _AddonGroupToProduct criada com sucesso.';
    ELSE
        RAISE NOTICE 'INFO: Tabela _AddonGroupToProduct ja existe.';
    END IF;

    -- _CategoryToProduct
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_CategoryToProduct') THEN
        CREATE TABLE "_CategoryToProduct" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");
        CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela _CategoryToProduct criada com sucesso.';
    ELSE
        RAISE NOTICE 'INFO: Tabela _CategoryToProduct ja existe.';
    END IF;

    -- _AddonGroupToCategory
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_AddonGroupToCategory') THEN
        CREATE TABLE "_AddonGroupToCategory" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_AddonGroupToCategory_AB_unique" ON "_AddonGroupToCategory"("A", "B");
        CREATE INDEX "_AddonGroupToCategory_B_index" ON "_AddonGroupToCategory"("B");
        ALTER TABLE "_AddonGroupToCategory" ADD CONSTRAINT "_AddonGroupToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_AddonGroupToCategory" ADD CONSTRAINT "_AddonGroupToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela _AddonGroupToCategory criada com sucesso.';
    ELSE
        RAISE NOTICE 'INFO: Tabela _AddonGroupToCategory ja existe.';
    END IF;

    -- _PermissionToRole (Crucial para Login/Dashboard)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_PermissionToRole') THEN
        CREATE TABLE "_PermissionToRole" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");
        CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");
        ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela _PermissionToRole criada com sucesso.';
    ELSE
        RAISE NOTICE 'INFO: Tabela _PermissionToRole ja existe.';
    END IF;

    -- _UserPermissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_UserPermissions') THEN
        CREATE TABLE "_UserPermissions" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_UserPermissions_AB_unique" ON "_UserPermissions"("A", "B");
        CREATE INDEX "_UserPermissions_B_index" ON "_UserPermissions"("B");
        ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela _UserPermissions criada com sucesso.';
    ELSE
        RAISE NOTICE 'INFO: Tabela _UserPermissions ja existe.';
    END IF;

    -- 2. Garantir existência de Colunas na Tabela Addon (Erros 500)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Addon' AND column_name = 'description') THEN
        ALTER TABLE "Addon" ADD COLUMN "description" TEXT;
        RAISE NOTICE 'FIX: Coluna Addon.description adicionada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Addon' AND column_name = 'imageUrl') THEN
        ALTER TABLE "Addon" ADD COLUMN "imageUrl" TEXT;
        RAISE NOTICE 'FIX: Coluna Addon.imageUrl adicionada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Addon' AND column_name = 'maxQuantity') THEN
        ALTER TABLE "Addon" ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'FIX: Coluna Addon.maxQuantity adicionada.';
    END IF;

    -- 3. Garantir existência de Colunas na Tabela AddonGroup (Erros 500)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AddonGroup' AND column_name = 'isFlavorGroup') THEN
        ALTER TABLE "AddonGroup" ADD COLUMN "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'FIX: Coluna AddonGroup.isFlavorGroup adicionada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AddonGroup' AND column_name = 'minQuantity') THEN
        ALTER TABLE "AddonGroup" ADD COLUMN "minQuantity" INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'FIX: Coluna AddonGroup.minQuantity adicionada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AddonGroup' AND column_name = 'maxQuantity') THEN
        ALTER TABLE "AddonGroup" ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'FIX: Coluna AddonGroup.maxQuantity adicionada.';
    END IF;

    -- 4. Garantir existência de Colunas na Tabela Product (Erros 500)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'showInMenu') THEN
        ALTER TABLE "Product" ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'FIX: Coluna Product.showInMenu adicionada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'isFlavor') THEN
        ALTER TABLE "Product" ADD COLUMN "isFlavor" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'FIX: Coluna Product.isFlavor adicionada.';
    END IF;

    -- 5. Colunas de Integração Saipos em todas as tabelas
    FOR tbl IN SELECT unnest(ARRAY['Addon', 'AddonGroup', 'Product', 'Size', 'Category', 'Promotion', 'PaymentMethod']) LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'saiposIntegrationCode') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN "saiposIntegrationCode" TEXT', tbl);
            RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em %.', tbl;
        END IF;
    END LOOP;

    RAISE NOTICE 'Reparo de banco de dados finalizado com sucesso.';

END $$;
