require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Suporte para Docker Secrets em produção
if (!process.env.DATABASE_URL && fs.existsSync('/run/secrets/db_connection_string')) {
  process.env.DATABASE_URL = fs.readFileSync('/run/secrets/db_connection_string', 'utf8').trim();
}

const prisma = new PrismaClient();

async function fixDrivers() {
  console.log('--- BUSCANDO ENTREGADORES SEM CARGO ---');
  
  // Encontrar a Role de Entregador
  const driverRole = await prisma.role.findFirst({
    where: {
      OR: [
        { name: { equals: 'Entregador', mode: 'insensitive' } },
        { name: { equals: 'driver', mode: 'insensitive' } }
      ]
    }
  });

  if (!driverRole) {
    console.error('Role "Entregador" não encontrada. Execute o seed_permissions primeiro.');
    return;
  }

  // Buscar usuários que não tem roleId e que parecem ser entregadores
  // Ou que foram criados recentemente sem cargo
  const usersToFix = await prisma.user.findMany({
    where: {
      roleId: null,
      isSuperAdmin: false,
      // Filtro heurístico: se tiver campos de entregador preenchidos ou se o email/nome sugerir
      OR: [
        { paymentType: { in: ['DAILY', 'SHIFT', 'DELIVERY'] } },
        { name: { contains: 'entregador', mode: 'insensitive' } },
        { name: { contains: 'motoboy', mode: 'insensitive' } },
        { email: { contains: 'driver', mode: 'insensitive' } },
        { email: { contains: 'entregador', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Encontrados ${usersToFix.length} usuários para corrigir.`);

  for (const user of usersToFix) {
    console.log(`Corrigindo usuário: ${user.name} (${user.email}) -> Role: ${driverRole.name}`);
    await prisma.user.update({
      where: { id: user.id },
      data: { roleId: driverRole.id }
    });
  }

  console.log('--- CORREÇÃO FINALIZADA ---');
}

fixDrivers()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
