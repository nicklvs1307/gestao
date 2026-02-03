
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKdsData() {
  console.log('--- DIAGNÓSTICO KDS ---');

  // 1. Buscar pedidos que deveriam estar no KDS (PENDING ou PREPARING)
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PENDING', 'PREPARING'] }
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      },
      restaurant: {
        select: { name: true, id: true }
      }
    }
  });

  console.log(`Encontrados ${orders.length} pedidos com status PENDING ou PREPARING.`);

  orders.forEach(order => {
    console.log(`\nPedido #${order.dailyOrderNumber} (ID: ${order.id}) - Status: ${order.status} - Restaurante: ${order.restaurant.name}`);
    
    order.items.forEach(item => {
      console.log(`  - Item: ${item.product.name}`);
      console.log(`    > ID: ${item.id}`);
      console.log(`    > isPaid (Flag do KDS): ${item.isPaid} (True = Some do KDS / False = Aparece no KDS)`);
      console.log(`    > Área de Produção: ${item.product.category?.productionArea}`);
      
      if (item.isPaid) {
        console.warn('    [ALERTA] Este item NÃO aparecerá no KDS pois isPaid está true.');
      }
    });
  });
}

checkKdsData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
