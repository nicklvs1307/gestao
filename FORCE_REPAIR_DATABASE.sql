-- SCRIPT DE REPARO DE EMERGÊNCIA - Cardápio Tablets
-- Execute este script diretamente no seu banco de dados Postgres

-- 1. Reparar Tabela Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "showInMenu" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFlavor" BOOLEAN NOT NULL DEFAULT false;

-- 2. Reparar Tabela AddonGroup
ALTER TABLE "AddonGroup" ADD COLUMN IF NOT EXISTS "isFlavorGroup" BOOLEAN NOT NULL DEFAULT false;

-- 3. Garantir que o Prisma Client aceite as mudanças (Opcional, rode no terminal se possível)
-- npx prisma generate
