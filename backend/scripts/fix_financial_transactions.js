const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO CORREÇÃO DE LANÇAMENTOS FINANCEIROS ---');

  // 1. Buscar todos os pedidos concluídos que NÃO têm transação financeira
  const orders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      financialTransaction: { none: {} }
    },
    include: {
      payments: true,
      deliveryOrder: true
    }
  });

  console.log(`Encontrados ${orders.length} pedidos pendentes de lançamento.`);

  for (const order of orders) {
    try {
      // Busca ou cria categoria de vendas para o restaurante do pedido
      let category = await prisma.transactionCategory.findFirst({
        where: { restaurantId: order.restaurantId, name: 'Vendas' }
      });

      if (!category) {
        category = await prisma.transactionCategory.create({
          data: { name: 'Vendas', type: 'INCOME', isSystem: true, restaurantId: order.restaurantId }
        });
      }

      // Tenta achar um caixa que estava aberto na época (ou o último aberto)
      const session = await prisma.cashierSession.findFirst({
        where: { 
            restaurantId: order.restaurantId, 
            openedAt: { lte: order.createdAt },
            OR: [
                { closedAt: null },
                { closedAt: { gte: order.createdAt } }
            ]
        }
      });

      const method = order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method || 'Outro';

      await prisma.financialTransaction.create({
        data: {
          restaurantId: order.restaurantId,
          orderId: order.id,
          categoryId: category.id,
          cashierId: session?.id || null,
          description: `VENDA #${order.dailyOrderNumber || order.id.slice(-4)} (Migração)`,
          amount: order.total,
          type: 'INCOME',
          status: 'PAID',
          dueDate: order.createdAt,
          paymentDate: order.createdAt,
          paymentMethod: method
        }
      });

      console.log(`[OK] Pedido #${order.id} lançado no financeiro.`);
    } catch (err) {
      console.error(`[ERRO] Falha ao processar pedido #${order.id}:`, err.message);
    }
  }

  console.log('--- CORREÇÃO FINALIZADA ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
