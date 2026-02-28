const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const col = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'WhatsAppConversation' AND column_name = 'labels'`;
  console.log('labels exists in WhatsAppConversation?', col);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
