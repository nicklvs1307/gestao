-- MIGRACAO INTELIGENTE PARA CORREÇÃO DE COLUNAS ERP (STYLE SAIPOS)
-- Autor: Gemini CLI
-- Data: 2026-02-28
-- Este script verifica cada coluna individualmente e notifica o progresso no log.

DO $$ 
BEGIN 
    RAISE NOTICE 'Iniciando verificacao de integridade das colunas ERP...';

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

    -- 4. Tabela de Junção (Muitos para Muitos) para Categorias
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_CategoryToProduct') THEN
        CREATE TABLE "public"."_CategoryToProduct" (
            "A" TEXT NOT NULL,
            "B" TEXT NOT NULL
        );
        CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "public"."_CategoryToProduct"("A", "B");
        CREATE INDEX "_CategoryToProduct_B_index" ON "public"."_CategoryToProduct"("B");
        
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_A_fkey') THEN
            ALTER TABLE "public"."_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_B_fkey') THEN
            ALTER TABLE "public"."_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        RAISE NOTICE 'FIX: Tabela de juncao _CategoryToProduct criada.';
    ELSE
        RAISE NOTICE 'INFO: Tabela de juncao _CategoryToProduct ja existe.';
    END IF;

    -- 5. Colunas de Integração Saipos em todas as tabelas
    -- Note: Usando loop para garantir clareza e cobertura
    RAISE NOTICE 'Iniciando verificacao de colunas de integracao Saipos...';
    
    -- Tabela Addon
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Addon' AND column_name = 'saiposIntegrationCode') THEN
        ALTER TABLE "public"."Addon" ADD COLUMN "saiposIntegrationCode" TEXT;
        RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em Addon.';
    END IF;

    -- Tabela AddonGroup
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AddonGroup' AND column_name = 'saiposIntegrationCode') THEN
        ALTER TABLE "public"."AddonGroup" ADD COLUMN "saiposIntegrationCode" TEXT;
        RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em AddonGroup.';
    END IF;

    -- Tabela Product
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'saiposIntegrationCode') THEN
        ALTER TABLE "public"."Product" ADD COLUMN "saiposIntegrationCode" TEXT;
        RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em Product.';
    END IF;

    -- Tabela Size
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Size' AND column_name = 'saiposIntegrationCode') THEN
        ALTER TABLE "public"."Size" ADD COLUMN "saiposIntegrationCode" TEXT;
        RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em Size.';
    END IF;

    -- Tabela Category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Category' AND column_name = 'saiposIntegrationCode') THEN
        ALTER TABLE "public"."Category" ADD COLUMN "saiposIntegrationCode" TEXT;
        RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em Category.';
    END IF;

    -- Tabela Promotion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Promotion' AND column_name = 'saiposIntegrationCode') THEN
        ALTER TABLE "public"."Promotion" ADD COLUMN "saiposIntegrationCode" TEXT;
        RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em Promotion.';
    END IF;

    -- Tabela PaymentMethod
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PaymentMethod' AND column_name = 'saiposIntegrationCode') THEN
        ALTER TABLE "public"."PaymentMethod" ADD COLUMN "saiposIntegrationCode" TEXT;
        RAISE NOTICE 'FIX: saiposIntegrationCode adicionado em PaymentMethod.';
    END IF;

    RAISE NOTICE 'Verificacao de integridade finalizada com sucesso.';

END $$;
