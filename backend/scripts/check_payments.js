const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const methods = await prisma.paymentMethod.findMany({
    include: { restaurant: true }
  });
  console.log('Payment Methods found:', methods.length);
  methods.forEach(m => {
    console.log(`- [${m.restaurant.slug}] ${m.name} (${m.type}): Active=${m.isActive}, Delivery=${m.allowDelivery}, POS=${m.allowPos}, Table=${m.allowTable}`);
  });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
