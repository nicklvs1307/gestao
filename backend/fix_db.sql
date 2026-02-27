-- Script de emergência para criar as colunas que falharam na migração anterior
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE "Product" ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT true;
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Coluna showInMenu já existe';
    END;

    BEGIN
        ALTER TABLE "Product" ADD COLUMN "isFlavor" BOOLEAN NOT NULL DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Coluna isFlavor já existe';
    END;

    BEGIN
        ALTER TABLE "AddonGroup" ADD COLUMN "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Coluna isFlavorGroup já existe';
    END;
END $$;
