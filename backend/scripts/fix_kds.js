
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixKdsData() {
  console.log('--- CORREÇÃO DE DADOS KDS ---');

  // Atualiza todos os itens de pedidos PENDING/PREPARING para isPaid = false
  // Assumindo que isPaid aqui significa "Pronto na Cozinha" e não "Financeiramente Pago"
  const result = await prisma.orderItem.updateMany({
    where: {
      order: {
        status: { in: ['PENDING', 'PREPARING'] }
      },
      isPaid: true
    },
    data: {
      isPaid: false
    }
  });

  console.log(`Atualizados ${result.count} itens para 'Não Pronto' (isPaid = false).`);
  console.log('O KDS deve voltar a exibir esses itens agora.');
}

fixKdsData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
