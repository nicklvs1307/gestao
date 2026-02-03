
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupKds() {
  console.log('--- LIMPEZA FINAL KDS (ISREADY) ---');

  // 1. Pedidos finalizados devem ter seus itens marcados como prontos (isReady: true)
  // Para não poluir o KDS se o status do pedido mudar por algum motivo
  const resultFinished = await prisma.orderItem.updateMany({
    where: {
      order: {
        status: { in: ['COMPLETED', 'DELIVERED', 'CANCELED', 'SHIPPED', 'READY'] }
      },
      isReady: false
    },
    data: {
      isReady: true
    }
  });
  console.log(`Marcados ${resultFinished.count} itens de pedidos finalizados como 'Prontos'.`);

  // 2. Pedidos em andamento (PENDING, PREPARING) devem estar como 'Não Prontos' (isReady: false)
  // Já é o default, mas garantindo...
  const resultPending = await prisma.orderItem.updateMany({
    where: {
      order: {
        status: { in: ['PENDING', 'PREPARING'] }
      },
      isReady: true // Se por acaso migrou como true
    },
    data: {
      isReady: false
    }
  });
  console.log(`Marcados ${resultPending.count} itens de pedidos em andamento como 'Não Prontos'.`);

  console.log('Sincronização KDS x Kanban concluída.');
}

cleanupKds()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
