-- SEGUNDA MIGRACAO INTELIGENTE: TABELAS DE JUNCAO E PERMISSÕES
-- Autor: Gemini CLI
-- Data: 2026-02-28
-- Este script garante a existência de tabelas de junção M:N que podem ter sido omitidas.

DO $$ 
BEGIN 
    RAISE NOTICE 'Iniciando criacao de tabelas de juncao implicitamente requeridas pelo Prisma...';

    -- 1. _AddonGroupToProduct (Muitos para Muitos entre Complementos e Produtos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_AddonGroupToProduct') THEN
        CREATE TABLE "public"."_AddonGroupToProduct" (
            "A" TEXT NOT NULL,
            "B" TEXT NOT NULL
        );
        CREATE UNIQUE INDEX "_AddonGroupToProduct_AB_unique" ON "public"."_AddonGroupToProduct"("A", "B");
        CREATE INDEX "_AddonGroupToProduct_B_index" ON "public"."_AddonGroupToProduct"("B");
        
        ALTER TABLE "public"."_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "AddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "public"."_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela de juncao _AddonGroupToProduct criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _AddonGroupToProduct ja existe.';
    END IF;

    -- 2. _PermissionToRole (Muitos para Muitos entre Permissões e Cargos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_PermissionToRole') THEN
        CREATE TABLE "public"."_PermissionToRole" (
            "A" TEXT NOT NULL,
            "B" TEXT NOT NULL
        );
        CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "public"."_PermissionToRole"("A", "B");
        CREATE INDEX "_PermissionToRole_B_index" ON "public"."_PermissionToRole"("B");
        
        ALTER TABLE "public"."_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "public"."_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela de juncao _PermissionToRole criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _PermissionToRole ja existe.';
    END IF;

    -- 3. _UserPermissions (Muitos para Muitos entre Usuários e Permissões Diretas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_UserPermissions') THEN
        CREATE TABLE "public"."_UserPermissions" (
            "A" TEXT NOT NULL,
            "B" TEXT NOT NULL
        );
        CREATE UNIQUE INDEX "_UserPermissions_AB_unique" ON "public"."_UserPermissions"("A", "B");
        CREATE INDEX "_UserPermissions_B_index" ON "public"."_UserPermissions"("B");
        
        ALTER TABLE "public"."_UserPermissions" ADD CONSTRAINT "_UserPermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "public"."_UserPermissions" ADD CONSTRAINT "_UserPermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FIX: Tabela de juncao _UserPermissions criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _UserPermissions ja existe.';
    END IF;

    RAISE NOTICE 'Sincronizacao de tabelas de juncao finalizada.';

END $$;
