-- Atualiza todos os usuários para ter um roleId se não tiverem, baseado na string 'role' antiga
-- Assume que já existem Roles criadas. Se não, você precisaria criar.

-- (Opcional) Criar Roles padrão se não existirem (PostgreSQL específico)
INSERT INTO "Role" (id, name, description, "isSystem", "updatedAt")
VALUES 
  (gen_random_uuid(), 'admin', 'Administrador do Sistema', true, NOW()),
  (gen_random_uuid(), 'staff', 'Funcionário Padrão', true, NOW())
ON CONFLICT ("name", "franchiseId") DO NOTHING;

-- Migra dados da coluna string 'role' para 'roleId' (Exemplo simplificado)
UPDATE "User" 
SET "roleId" = (SELECT id FROM "Role" WHERE name = "User".role LIMIT 1)
WHERE "roleId" IS NULL;

-- Remove a coluna antiga
ALTER TABLE "User" DROP COLUMN "role";
