const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const restaurantId = "clgq0v1y00000t3d8b4e6f2g1";
  const orderCount = await prisma.order.count({
    where: { restaurantId }
  });
  const completedOrderCount = await prisma.order.count({
    where: { restaurantId, status: 'COMPLETED' }
  });
  console.log({ restaurantId, totalOrders: orderCount, completedOrders: completedOrderCount });

  const recentOrders = await prisma.order.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent orders:', JSON.stringify(recentOrders, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
