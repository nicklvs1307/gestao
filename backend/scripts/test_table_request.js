
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTableRequest() {
  console.log('--- TESTE DE CHAMADO DE MESA ---');

  // Pega o primeiro restaurante disponível
  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) {
    console.error('Nenhum restaurante encontrado no banco.');
    return;
  }

  console.log(`Usando restaurante: ${restaurant.name} (ID: ${restaurant.id})`);

  try {
    const newRequest = await prisma.tableRequest.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: 99,
        type: 'WAITER',
        status: 'PENDING'
      }
    });

    console.log('Sucesso! Chamado criado:', newRequest);

    // Agora tenta buscar como o monitor faria
    const requests = await prisma.tableRequest.findMany({
      where: {
        restaurantId: restaurant.id,
        status: 'PENDING'
      }
    });

    console.log(`Busca para o monitor retornou ${requests.length} chamados.`);
    
    // Deleta o chamado de teste
    await prisma.tableRequest.delete({ where: { id: newRequest.id } });
    console.log('Chamado de teste removido.');

  } catch (error) {
    console.error('Erro ao processar chamado:', error);
  }
}

testTableRequest()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
