const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRaw`SELECT * FROM "_prisma_migrations" ORDER BY applied_steps_count DESC, id DESC`;
  console.log('Applied Migrations:');
  migrations.forEach(m => {
    console.log(`- ${m.migration_name} (Applied at: ${m.finished_at})`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
