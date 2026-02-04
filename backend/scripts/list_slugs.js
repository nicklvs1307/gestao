const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRestaurants() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    console.log('\n--- RESTAURANTES ENCONTRADOS ---');
    if (restaurants.length === 0) {
        console.log('Nenhum restaurante encontrado no banco de dados.');
    } else {
        console.table(restaurants);
    }
    console.log('--------------------------------\n');

  } catch (error) {
    console.error('Erro ao buscar restaurantes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRestaurants();
