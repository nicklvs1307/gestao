const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const rs = await prisma.restaurant.findMany({ include: { _count: { select: { categories: true, products: true } } } });
  console.log('Dados:', JSON.stringify(rs, null, 2));
  const ps = await prisma.product.findMany({ take: 5 });
  console.log('Produtos:', JSON.stringify(ps, null, 2));
}
check().catch(console.error);