-- MIGRACAO INTELIGENTE PARA CORREÇÃO DE COLUNAS ERP (STYLE SAIPOS) E TABELAS DE JUNÇÃO
-- Autor: Gemini CLI
-- Data: 2026-02-28
-- Este script verifica cada coluna e tabela individualmente e notifica o progresso no log.

DO $$ 
BEGIN 
    RAISE NOTICE 'Iniciando verificacao de integridade das colunas ERP e tabelas de juncao...';

    -- 1. Tabela Addon (O ponto principal de erro)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Addon' AND column_name = 'description') THEN
        ALTER TABLE "public"."Addon" ADD COLUMN "description" TEXT;
        RAISE NOTICE 'FIX: Coluna "description" adicionada na tabela Addon.';
    ELSE
        RAISE NOTICE 'INFO: Coluna "description" ja existe na tabela Addon.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Addon' AND column_name = 'imageUrl') THEN
        ALTER TABLE "public"."Addon" ADD COLUMN "imageUrl" TEXT;
        RAISE NOTICE 'FIX: Coluna "imageUrl" adicionada na tabela Addon.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Addon' AND column_name = 'maxQuantity') THEN
        ALTER TABLE "public"."Addon" ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'FIX: Coluna "maxQuantity" adicionada na tabela Addon.';
    END IF;

    -- 2. Tabela AddonGroup
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AddonGroup' AND column_name = 'isFlavorGroup') THEN
        ALTER TABLE "public"."AddonGroup" ADD COLUMN "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'FIX: Coluna "isFlavorGroup" adicionada na tabela AddonGroup.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AddonGroup' AND column_name = 'minQuantity') THEN
        ALTER TABLE "public"."AddonGroup" ADD COLUMN "minQuantity" INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'FIX: Coluna "minQuantity" adicionada na tabela AddonGroup.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AddonGroup' AND column_name = 'maxQuantity') THEN
        ALTER TABLE "public"."AddonGroup" ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'FIX: Coluna "maxQuantity" adicionada na tabela AddonGroup.';
    END IF;

    -- 3. Tabela Product
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'showInMenu') THEN
        ALTER TABLE "public"."Product" ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'FIX: Coluna "showInMenu" adicionada na tabela Product.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'isFlavor') THEN
        ALTER TABLE "public"."Product" ADD COLUMN "isFlavor" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'FIX: Coluna "isFlavor" adicionada na tabela Product.';
    END IF;

    -- 4. Tabelas de Junção (Muitos para Muitos) - CRITICAL FIX
    
    -- 4.1. _CategoryToProduct
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_CategoryToProduct') THEN
        CREATE TABLE "public"."_CategoryToProduct" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "public"."_CategoryToProduct"("A", "B");
        CREATE INDEX "_CategoryToProduct_B_index" ON "public"."_CategoryToProduct"("B");
        ALTER TABLE "public"."_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "public"."_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela de juncao _CategoryToProduct criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _CategoryToProduct ja existe.';
    END IF;

    -- 4.2. _AddonGroupToProduct (MISSING IN PREVIOUS MIGRATIONS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_AddonGroupToProduct') THEN
        CREATE TABLE "public"."_AddonGroupToProduct" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_AddonGroupToProduct_AB_unique" ON "public"."_AddonGroupToProduct"("A", "B");
        CREATE INDEX "_AddonGroupToProduct_B_index" ON "public"."_AddonGroupToProduct"("B");
        ALTER TABLE "public"."_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "public"."_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela de juncao _AddonGroupToProduct criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _AddonGroupToProduct ja existe.';
    END IF;

    -- 4.3. _PermissionToRole (ESSENTIAL FOR AUTH)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_PermissionToRole') THEN
        CREATE TABLE "public"."_PermissionToRole" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "public"."_PermissionToRole"("A", "B");
        CREATE INDEX "_PermissionToRole_B_index" ON "public"."_PermissionToRole"("B");
        ALTER TABLE "public"."_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "public"."_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela de juncao _PermissionToRole criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _PermissionToRole ja existe.';
    END IF;

    -- 4.4. _UserPermissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_UserPermissions') THEN
        CREATE TABLE "public"."_UserPermissions" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
        CREATE UNIQUE INDEX "_UserPermissions_AB_unique" ON "public"."_UserPermissions"("A", "B");
        CREATE INDEX "_UserPermissions_B_index" ON "public"."_UserPermissions"("B");
        ALTER TABLE "public"."_UserPermissions" ADD CONSTRAINT "_UserPermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "public"."_UserPermissions" ADD CONSTRAINT "_UserPermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela de juncao _UserPermissions criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _UserPermissions ja existe.';
    END IF;

    -- 5. Colunas de Integração Saipos
    RAISE NOTICE 'Iniciando verificacao de colunas de integracao Saipos...';
    
    FOR tbl IN SELECT unnest(ARRAY['Addon', 'AddonGroup', 'Product', 'Size', 'Category', 'Promotion', 'PaymentMethod']) LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'saiposIntegrationCode') THEN
            EXECUTE format('ALTER TABLE "public".%I ADD COLUMN "saiposIntegrationCode" TEXT', tbl);
            RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em %.', tbl;
        END IF;
    END LOOP;

    RAISE NOTICE 'Verificacao de integridade finalizada com sucesso.';

END $$;
